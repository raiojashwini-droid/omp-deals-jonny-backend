const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'EXECUTIVE_ADMIN' },
    select: { id: true, email: true, organizationId: true, role: true }
  });
  console.log(users);
  
  const orgs = await prisma.organization.findMany();
  console.log('Organizations:', orgs);
}

main().finally(() => prisma.$disconnect());
