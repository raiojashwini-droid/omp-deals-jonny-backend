const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const stores = await p.store.findMany({ select: { id: true, name: true } });
  console.log('DB Connected! Stores:', JSON.stringify(stores));
}
main().catch(e => console.error('DB Error:', e.message)).finally(() => p.$disconnect());
