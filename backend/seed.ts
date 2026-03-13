import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create Ingredients
  const ingredientsData = [
    { name: 'Basmathi Rice', unit: 'g', currentStock: 50000, minimumReorder: 10000, unitCost: 1.5 },
    { name: 'Chicken', unit: 'g', currentStock: 30000, minimumReorder: 5000, unitCost: 1.2 },
    { name: 'Egg', unit: 'pcs', currentStock: 1000, minimumReorder: 200, unitCost: 40 },
    { name: 'Carrot', unit: 'g', currentStock: 15000, minimumReorder: 3000, unitCost: 0.5 },
    { name: 'Leeks', unit: 'g', currentStock: 10000, minimumReorder: 2000, unitCost: 0.4 },
    { name: 'Oil', unit: 'ml', currentStock: 20000, minimumReorder: 5000, unitCost: 0.8 },
    { name: 'Parata', unit: 'pcs', currentStock: 500, minimumReorder: 100, unitCost: 35 },
    { name: 'Cabbage', unit: 'g', currentStock: 12000, minimumReorder: 3000, unitCost: 0.3 },
    { name: 'Onion', unit: 'g', currentStock: 25000, minimumReorder: 5000, unitCost: 0.6 },
    { name: 'Gravy', unit: 'ml', currentStock: 15000, minimumReorder: 3000, unitCost: 0.5 }
  ];

  const ingredientMap: Record<string, number> = {};
  for (const item of ingredientsData) {
    const ing = await prisma.ingredient.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
    ingredientMap[ing.name] = ing.id;
  }

  // 2. Create Menu Items & BOMs
  // Item 1: Chicken Fried Rice
  const cfrS = await prisma.menuItem.upsert({
    where: { name_size: { name: 'Chicken Fried Rice', size: 'S' } },
    update: {},
    create: { name: 'Chicken Fried Rice', category: 'Rice', price: 800, size: 'S', prepTimeMins: 15 }
  });
  const cfrM = await prisma.menuItem.upsert({
    where: { name_size: { name: 'Chicken Fried Rice', size: 'M' } },
    update: {},
    create: { name: 'Chicken Fried Rice', category: 'Rice', price: 1400, size: 'M', prepTimeMins: 15 }
  });
  const cfrL = await prisma.menuItem.upsert({
    where: { name_size: { name: 'Chicken Fried Rice', size: 'L' } },
    update: {},
    create: { name: 'Chicken Fried Rice', category: 'Rice', price: 2200, size: 'L', prepTimeMins: 15 }
  });

  // BOM for Chicken Fried Rice
  const cfrBoms = [
    // Small
    { menuItemId: cfrS.id, ingredientId: ingredientMap['Basmathi Rice'], quantity: 150 },
    { menuItemId: cfrS.id, ingredientId: ingredientMap['Chicken'], quantity: 100 },
    { menuItemId: cfrS.id, ingredientId: ingredientMap['Egg'], quantity: 1 },
    { menuItemId: cfrS.id, ingredientId: ingredientMap['Carrot'], quantity: 50 },
    { menuItemId: cfrS.id, ingredientId: ingredientMap['Leeks'], quantity: 30 },
    { menuItemId: cfrS.id, ingredientId: ingredientMap['Oil'], quantity: 20 },
    // Medium
    { menuItemId: cfrM.id, ingredientId: ingredientMap['Basmathi Rice'], quantity: 300 },
    { menuItemId: cfrM.id, ingredientId: ingredientMap['Chicken'], quantity: 200 },
    { menuItemId: cfrM.id, ingredientId: ingredientMap['Egg'], quantity: 2 },
    { menuItemId: cfrM.id, ingredientId: ingredientMap['Carrot'], quantity: 100 },
    { menuItemId: cfrM.id, ingredientId: ingredientMap['Leeks'], quantity: 60 },
    { menuItemId: cfrM.id, ingredientId: ingredientMap['Oil'], quantity: 40 },
    // Large
    { menuItemId: cfrL.id, ingredientId: ingredientMap['Basmathi Rice'], quantity: 500 },
    { menuItemId: cfrL.id, ingredientId: ingredientMap['Chicken'], quantity: 350 },
    { menuItemId: cfrL.id, ingredientId: ingredientMap['Egg'], quantity: 3 },
    { menuItemId: cfrL.id, ingredientId: ingredientMap['Carrot'], quantity: 150 },
    { menuItemId: cfrL.id, ingredientId: ingredientMap['Leeks'], quantity: 100 },
    { menuItemId: cfrL.id, ingredientId: ingredientMap['Oil'], quantity: 60 },
  ];

  // Item 2: Egg Koththu
  const ekS = await prisma.menuItem.upsert({
    where: { name_size: { name: 'Egg Koththu', size: 'S' } },
    update: {},
    create: { name: 'Egg Koththu', category: 'Koththu', price: 600, size: 'S', prepTimeMins: 12 }
  });
  const ekM = await prisma.menuItem.upsert({
    where: { name_size: { name: 'Egg Koththu', size: 'M' } },
    update: {},
    create: { name: 'Egg Koththu', category: 'Koththu', price: 1000, size: 'M', prepTimeMins: 12 }
  });
  const ekL = await prisma.menuItem.upsert({
    where: { name_size: { name: 'Egg Koththu', size: 'L' } },
    update: {},
    create: { name: 'Egg Koththu', category: 'Koththu', price: 1800, size: 'L', prepTimeMins: 12 }
  });

  const ekBoms = [
    // Small
    { menuItemId: ekS.id, ingredientId: ingredientMap['Parata'], quantity: 2 },
    { menuItemId: ekS.id, ingredientId: ingredientMap['Egg'], quantity: 2 },
    { menuItemId: ekS.id, ingredientId: ingredientMap['Cabbage'], quantity: 50 },
    { menuItemId: ekS.id, ingredientId: ingredientMap['Carrot'], quantity: 50 },
    { menuItemId: ekS.id, ingredientId: ingredientMap['Onion'], quantity: 30 },
    { menuItemId: ekS.id, ingredientId: ingredientMap['Gravy'], quantity: 100 },
    // Medium
    { menuItemId: ekM.id, ingredientId: ingredientMap['Parata'], quantity: 4 },
    { menuItemId: ekM.id, ingredientId: ingredientMap['Egg'], quantity: 3 },
    { menuItemId: ekM.id, ingredientId: ingredientMap['Cabbage'], quantity: 100 },
    { menuItemId: ekM.id, ingredientId: ingredientMap['Carrot'], quantity: 100 },
    { menuItemId: ekM.id, ingredientId: ingredientMap['Onion'], quantity: 60 },
    { menuItemId: ekM.id, ingredientId: ingredientMap['Gravy'], quantity: 200 },
    // Large
    { menuItemId: ekL.id, ingredientId: ingredientMap['Parata'], quantity: 7 },
    { menuItemId: ekL.id, ingredientId: ingredientMap['Egg'], quantity: 5 },
    { menuItemId: ekL.id, ingredientId: ingredientMap['Cabbage'], quantity: 150 },
    { menuItemId: ekL.id, ingredientId: ingredientMap['Carrot'], quantity: 150 },
    { menuItemId: ekL.id, ingredientId: ingredientMap['Onion'], quantity: 100 },
    { menuItemId: ekL.id, ingredientId: ingredientMap['Gravy'], quantity: 350 },
  ];

  const allBoms = [...cfrBoms, ...ekBoms];

  for (const bom of allBoms) {
    await prisma.billOfMaterial.upsert({
      where: {
        menuItemId_ingredientId: {
          menuItemId: bom.menuItemId,
          ingredientId: bom.ingredientId
        }
      },
      update: { quantity: bom.quantity },
      create: bom,
    });
  }

  // 3. Create a Chef and Manager accounts
  await prisma.user.upsert({
    where: { email: 'manager@smartrestaurant.com' },
    update: {},
    create: { name: 'John Manager', email: 'manager@smartrestaurant.com', password: 'password', role: 'MANAGER' }
  });
  await prisma.user.upsert({
    where: { email: 'chef@smartrestaurant.com' },
    update: {},
    create: { name: 'Gordon Chef', email: 'chef@smartrestaurant.com', password: 'password', role: 'CHEF' }
  });

  console.log('Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
