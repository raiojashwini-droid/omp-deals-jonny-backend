const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const store = await p.store.findUnique({ where: { id: 'auto-money-fl' } });
  console.log('Store:', store.name);
  const vehicles = await p.vehicle.findMany({ where: { storeId: 'auto-money-fl' } });
  console.log('Vehicles:', vehicles.length);
}
main().catch(e => console.error('DB Error:', e.message)).finally(() => p.$disconnect());
