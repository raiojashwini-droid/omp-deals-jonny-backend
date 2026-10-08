const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { role: 'EXECUTIVE_ADMIN', organizationId: null },
    data: { organizationId: 'test-org' }
  });
  console.log('Fixed users.');
}

main().finally(() => prisma.$disconnect());
