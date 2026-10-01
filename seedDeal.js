const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function seedDeal() {
  const store = await p.store.findUnique({ where: { id: 'auto-money-fl' } });
  const vehicle = await p.vehicle.findFirst({ where: { storeId: 'auto-money-fl' } });
  
  // get or create a rep
  const rep = await p.user.findFirst({ where: { role: 'SALES_REP' } });
  
  const deal = await p.deal.create({
    data: {
      storeId: store.id,
      vehicleId: vehicle.id,
      salesRepId: rep.id,
      customerName: 'Derrick Miller',
      status: 'DESKING',
      salePrice: 34990.00,
      downPayment: 4000.00,
      totalFinanced: 33184.38,
      buyerAddress: '1948 Oak Lawn Ave, Dallas, TX',
      eSignStatus: 'PENDING'
    }
  });
  console.log('Seeded deal:', deal.id);
}
seedDeal().catch(console.error).finally(()=>p.$disconnect());
