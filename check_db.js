require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    await prisma.$connect();
    console.log('✅ DB Connected');
    
    const storeCount = await prisma.store.count();
    console.log('✅ Stores:', storeCount);
    
    const vehicleCount = await prisma.vehicle.count();
    console.log('✅ Vehicles:', vehicleCount);
    
    const leadCount = await prisma.lead.count();
    console.log('✅ Leads:', leadCount);
    
    const userCount = await prisma.user.count();
    console.log('✅ Users:', userCount);
    
    // Show all tables that exist
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('\n📋 ALL TABLES IN DB:');
    tables.forEach(t => console.log(' -', Object.values(t)[0]));
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
