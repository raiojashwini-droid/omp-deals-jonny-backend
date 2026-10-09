const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const targetStoreIds = ['auto-money-fl'];
    console.log('Querying deals...');
    await prisma.deal.findMany({ where: { storeId: { in: targetStoreIds }, status: 'WON' } });
    console.log('Querying expenses...');
    await prisma.expense.findMany({ where: { storeId: { in: targetStoreIds } } });
    console.log('Querying reconditioningOrder...');
    await prisma.reconditioningOrder.findMany({ where: { storeId: { in: targetStoreIds }, status: 'COMPLETED' } });
    console.log('Success');
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
