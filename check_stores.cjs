const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const stores = await prisma.store.findMany({
      include: { organization: true }
    });
    console.log('Stores in DB:');
    console.log(JSON.stringify(stores.map(s => ({ id: s.id, name: s.name, orgId: s.organizationId })), null, 2));
    
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, organizationId: true }
    });
    console.log('Users in DB:');
    console.log(JSON.stringify(users, null, 2));
  } catch(e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
