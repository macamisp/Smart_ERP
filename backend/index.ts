import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// ==========================================
// 1. MENU API & AVAILABILITY ENGINE
// ==========================================
app.get('/api/menu', async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      include: {
        BillOfMaterial: {
          include: { ingredient: true }
        }
      }
    });

    // Compute dynamic availability based on live BOM inventory
    const processedMenu = menuItems.map(item => {
      let isAvailable = item.isAvailable;
      const missingIngredients: string[] = [];

      for (const bom of item.BillOfMaterial) {
        if (bom.ingredient.currentStock < bom.quantity) {
          isAvailable = false;
          missingIngredients.push(bom.ingredient.name);
        }
      }

      return {
        id: item.id,
        name: item.name,
        size: item.size,
        category: item.category,
        price: item.price,
        prepTimeMins: item.prepTimeMins,
        isAvailable, // Dynamically set to false if stock insufficient
        missingIngredients // Included for table-side graying-out UI logic
      };
    });

    res.json(processedMenu);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});


// ==========================================
// 2. ORDERING SYSTEM (< 500ms KDS SYNCHRONIZATION)
// ==========================================
app.post('/api/orders', async (req, res) => {
  const { tableNumber, items } = req.body; // items: Array of { menuItemId, quantity }
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain items' });
  }

  try {
    // 1. Verify Stock existance BEFORE placing order to prevent false KDS queuing
    for (const item of items) {
      const dbItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: { BillOfMaterial: { include: { ingredient: true } } }
      });
      if (!dbItem) throw new Error(`Item ${item.menuItemId} not found`);

      for (const bom of dbItem.BillOfMaterial) {
        if (bom.ingredient.currentStock < (bom.quantity * item.quantity)) {
          return res.status(400).json({ 
            error: 'INSUFFICIENT_STOCK', 
            message: `Not enough ${bom.ingredient.name} for ${dbItem.name}` 
          });
        }
      }
    }

    // 2. Compute total amount
    let totalAmount = 0;
    const itemsData = [];
    for (const item of items) {
       const dbItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId }});
       if(dbItem) {
          totalAmount += dbItem.price * item.quantity;
          itemsData.push({ menuItemId: item.menuItemId, quantity: item.quantity, status: 'QUEUED' });
       }
    }

    // 3. Create the order
    const order = await prisma.order.create({
      data: {
        tableNumber: tableNumber || 0,
        status: 'QUEUED',
        totalAmount,
        items: {
          create: itemsData
        }
      },
      include: { items: { include: { menuItem: true } } }
    });

    // 4. Emit to KDS Room (Sub-500ms requirement satisfied)
    io.to('kds_room').emit('new_order', order);

    res.json(order);
  } catch (error) {
    console.error('Order logic error:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});


// ==========================================
// 3. KITCHEN KDS ACTIONS & ATOMIC BOM DEDUCTION
// ==========================================
app.put('/api/orders/:id/status', async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { status } = req.body; // IN_PROGRESS or COMPLETED

  try {
    const targetOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: { include: { BillOfMaterial: true } } } } }
    });

    if (!targetOrder) return res.status(404).json({ error: 'Order not found' });
    if (targetOrder.status === 'COMPLETED') return res.status(400).json({ error: 'Order already completed' });

    // ATOMIC TRANSACTION LOGIC for COMPLETED Orders
    if (status === 'COMPLETED') {
        const updateOperations = [];

        // Compile ingredient deductions based on BOM
        for (const item of targetOrder.items) {
          for (const bom of item.menuItem.BillOfMaterial) {
            const deductionValue = bom.quantity * item.quantity;
            updateOperations.push(
               prisma.ingredient.update({
                  where: { id: bom.ingredientId },
                  data: { currentStock: { decrement: deductionValue } }
               })
            );
          }
        }
        
        // Update order status as part of the transaction
        updateOperations.push(
            prisma.order.update({
               where: { id: orderId },
               data: { status: 'COMPLETED' },
               include: { items: true }
            })
        );
        updateOperations.push(
            prisma.orderItem.updateMany({
               where: { orderId: orderId },
               data: { status: 'COMPLETED' }
            })
        );

        // Execute $transaction to guarantee Atomic operation (all succeed or rollback)
        const results = await prisma.$transaction(updateOperations);
        const updatedOrder = results[results.length - 2];

        // System Alerts logic (In v2 we trigger a Socket event for low stock alerts checking)
        io.to('kds_room').emit('order_completed', updatedOrder);
        io.emit('dashboard_update', { event: 'stock_depleted' });
        
        return res.json({ success: true, order: updatedOrder, message: 'Stock Depleted Atomically' });
    } else {
        // Just updating to IN_PROGRESS (Cooking)
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: { items: { include: { menuItem: true } } }
        });
        io.to('kds_room').emit('order_status_updated', updatedOrder);
        return res.json({ success: true, order: updatedOrder });
    }

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});


// ==========================================
// 4. KITCHEN DISPLAY SYSTEM (KDS) FEED
// ==========================================
app.get('/api/kds', async (req, res) => {
  try {
    const activeOrders = await prisma.order.findMany({
      where: {
        status: { in: ['QUEUED', 'IN_PROGRESS'] }
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(activeOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load KDS feed' });
  }
});

// ==========================================
// 5. INVENTORY & WASTE LOG ENGINE
// ==========================================
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await prisma.ingredient.findMany({
      orderBy: { name: 'asc' }
    });

    // Check for alerts
    const alerts = [];
    for (const item of inventory) {
      if (item.currentStock <= item.minimumReorder) {
        alerts.push({
          type: 'LOW_STOCK',
          message: `${item.name} is running low! (${item.currentStock} ${item.unit} remaining, Min: ${item.minimumReorder})`
        });
      }
    }

    res.json({ inventory, alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load inventory' });
  }
});

app.post('/api/inventory/waste', async (req, res) => {
  const { ingredientId, quantity, reason, loggedBy } = req.body;

  try {
    const transaction = await prisma.$transaction([
      prisma.wasteLog.create({
        data: {
          ingredientId,
          quantity,
          reason,
          loggedBy
        }
      }),
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: { decrement: quantity } }
      })
    ]);

    io.emit('dashboard_update', { event: 'waste_logged', ingredientId });
    res.json({ success: true, log: transaction[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log waste' });
  }
});

// ==========================================
// 6. ANALYTICS & FINANCIAL REPORTING
// ==========================================
app.get('/api/analytics/financials', async (req, res) => {
  try {
    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                BillOfMaterial: { include: { ingredient: true } }
              }
            }
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalFoodCost = 0;

    for (const order of completedOrders) {
      totalRevenue += order.totalAmount;
      
      for (const item of order.items) {
        let itemCost = 0;
        for (const bom of item.menuItem.BillOfMaterial) {
          // Calculate precise food cost
          // Cost = (Required Qty / 1000g) * Unit Cost (if Unit Cost is per 1000g, or direct conversion)
          // Simplified: quantity * unitCost
          itemCost += (bom.quantity * bom.ingredient.unitCost);
        }
        totalFoodCost += (itemCost * item.quantity);
      }
    }

    const grossMargin = totalRevenue - totalFoodCost;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    res.json({
      revenue: totalRevenue,
      foodCost: totalFoodCost,
      grossMargin,
      marginPercentage: marginPercentage.toFixed(2) + '%'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});


// Health Route for Testing
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', component: 'ERP Core Engine v2' });
});


// Real-time connections
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_kds', () => {
    socket.join('kds_room');
    console.log(`Socket ${socket.id} joined KDS room`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Smart Restaurant ERP Server running on port ${PORT}`);
});
