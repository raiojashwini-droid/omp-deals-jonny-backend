const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rep = await prisma.user.findFirst({where: {role: 'SALES_REP'}});
  const store = await prisma.store.findFirst();
  const vehicle = await prisma.vehicle.findFirst();
  
  if (!rep || !store || !vehicle) return console.log('Missing deps');
  
  await prisma.lead.create({
    data: {
      customerName: 'Kiaan Test Lead',
      customerEmail: 'kiaan@example.com',
      customerPhone: '555-0199',
      phone_consent: true,
      is_buy_now: true,
      qualification: 'BUY_NOW',
      status: 'New',
      assignedToId: rep.id,
      storeId: store.id,
      vehicleId: vehicle.id
    }
  });
  console.log('Lead created!');
}

main().finally(() => prisma.$disconnect());
