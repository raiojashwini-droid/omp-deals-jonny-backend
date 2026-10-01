const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  await prisma.policeSafeSpot.createMany({ 
    data: [ 
      { department_name: 'Fremont Police Department', street_address: '2000 Stevenson Blvd', city: 'Fremont', state: 'CA', zip: '94538', latitude: 37.5485, longitude: -121.9886, surveillance_247: true }, 
      { department_name: 'Fort Lauderdale Police Department', street_address: '1300 W Broward Blvd', city: 'Fort Lauderdale', state: 'FL', zip: '33312', latitude: 26.1224, longitude: -80.1434, surveillance_247: true } 
    ], 
    skipDuplicates: true 
  }); 
  console.log('Seeded Police Safe Spots'); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
