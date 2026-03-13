'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ShoppingCart, Clock, CheckCircle2, ChevronRight, Ban, UtensilsCrossed } from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

type MenuItem = {
  id: number;
  name: string;
  size: string;
  category: string;
  price: number;
  prepTimeMins: number;
  isAvailable: boolean;
  missingIngredients: string[];
};

type CartItem = {
  menuItem: MenuItem;
  quantity: number;
};

type OrderStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'NONE';

export default function TabletApp() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber] = useState<number>(Math.floor(Math.random() * 20) + 1); // Mock table 1-20
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('NONE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenu();

    // Setup Socket
    const socket = io(SOCKET_URL);
    
    // In actual production guest tablet might just join its own table room. 
    // Here we listen globally to kds_room events to see status updates instantly
    socket.emit('join_kds'); 

    socket.on('order_status_updated', (order: any) => {
      if (order.id === activeOrderId) {
        setOrderStatus(order.status);
      }
    });

    socket.on('order_completed', (order: any) => {
      if (order.id === activeOrderId) {
        setOrderStatus('COMPLETED');
      }
    });
    
    // Automatically re-fetch menu when stock forces items offline
    socket.on('dashboard_update', (data: any) => {
        if(data.event === 'stock_depleted') {
            fetchMenu();
        }
    })

    return () => {
      socket.disconnect();
    };
  }, [activeOrderId]);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_URL}/menu`);
      const data = await res.json();
      setMenuItems(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    }
  };

  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;

    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.menuItem.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;

    try {
      const payload = {
        tableNumber,
        items: cart.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity }))
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if(data.error) {
          alert(`Order Error: ${data.message || data.error}`);
          return;
      }

      setActiveOrderId(data.id);
      setOrderStatus('QUEUED');
      setCart([]); // Clear Cart
    } catch (err) {
      console.error('Checkout failed', err);
    }
  };

  // Group Menu by Category
  const categories = Array.from(new Set(menuItems.map(m => m.category)));

  if (loading) return <div className="tablet-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-pulse title">Loading Menu...</div></div>;

  return (
    <div className="tablet-layout">
      
      {/* LEFT: Menu Grid */}
      <div className="menu-container animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="title">Smart Menu</h1>
            <p className="subtitle">Table {tableNumber} • Select items to begin</p>
          </div>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <UtensilsCrossed size={18} color="var(--accent-color)"/> Table {tableNumber}
          </div>
        </div>

        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: '3rem' }}>
            <h2 className="subtitle" style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1.5rem' }}>{cat}</h2>
            <div className="menu-grid">
              {menuItems.filter(m => m.category === cat).map(item => (
                <div 
                  key={item.id} 
                  className={`glass-panel menu-card ${!item.isAvailable ? 'unavailable' : ''}`}
                  onClick={() => addToCart(item)}
                >
                  <div className="header">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{item.name}</h3>
                    <div className="menu-price">Rs.{item.price}</div>
                  </div>
                  
                  <div className="menu-tags mt-4">
                    <span className="tag size">Size: {item.size}</span>
                    <span className="tag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12}/> {item.prepTimeMins}m
                    </span>
                    {!item.isAvailable && (
                        <span className="tag" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                            <Ban size={12} /> Out of Stock ({item.missingIngredients[0]})
                        </span>
                    )}
                  </div>
                  
                  {item.isAvailable && (
                    <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%', fontSize: '0.9rem', padding: '0.6rem' }}>
                      Add to Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT: Cart & Tracking Panel */}
      <div className="glass-panel cart-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="cart-header">
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={24} color="var(--accent-color)" /> My Order
          </h2>
        </div>

        <div className="cart-items">
          {cart.length === 0 && orderStatus === 'NONE' && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
              <ShoppingCart size={48} opacity={0.2} style={{ margin: '0 auto 1rem' }} />
              <p>Your cart is empty.</p>
              <p>Tap items to add them.</p>
            </div>
          )}

          {cart.map(item => (
            <div key={item.menuItem.id} className="cart-item animate-fade-in">
              <div className="cart-item-info">
                <h4>{item.menuItem.name} ({item.menuItem.size})</h4>
                <p>Rs.{item.menuItem.price * item.quantity}</p>
              </div>
              <div className="cart-actions">
                <button onClick={() => updateQuantity(item.menuItem.id, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.menuItem.id, 1)}>+</button>
              </div>
            </div>
          ))}

          {/* BRD Module 1: Order Progress Tracking Bar */}
          {activeOrderId && (
             <div className="progress-container animate-fade-in">
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--success-color)"/> Order #{activeOrderId} Status
                </h4>
                <div className="progress-steps">
                    <div className={`step ${orderStatus !== 'NONE' ? 'completed' : ''}`} title="Order Received"></div>
                    <div className={`step ${(orderStatus === 'IN_PROGRESS' || orderStatus === 'COMPLETED') ? 'completed' : ''}`} title="Preparing"></div>
                    <div className={`step ${orderStatus === 'COMPLETED' ? 'completed' : ''}`} title="Ready to Serve"></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Received</span>
                    <span style={{ color: orderStatus === 'IN_PROGRESS' ? 'var(--warning-color)' : ''}}>Preparing</span>
                    <span style={{ color: orderStatus === 'COMPLETED' ? 'var(--success-color)' : ''}}>Ready</span>
                </div>
                
                {orderStatus === 'COMPLETED' && (
                   <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success-color)', textAlign: 'center', fontWeight: 'bold' }}>
                      <p>Order is Ready to Serve! 🚀</p>
                      <button className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => { setActiveOrderId(null); setOrderStatus('NONE'); }}>New Order</button>
                   </div>
                )}
             </div>
          )}
        </div>

        {cart.length > 0 && orderStatus === 'NONE' && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>Rs.{cartTotal.toFixed(2)}</span>
            </div>
            <button className="btn btn-primary w-full" onClick={placeOrder}>
              Confirm & Place Order <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
