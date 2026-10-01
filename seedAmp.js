const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const userId = 'user-amp-001'; 
  
  // Seed Affiliate Link if not exists
  let link = await prisma.affiliateLink.findFirst({ where: { userId } });
  if (!link) {
    link = await prisma.affiliateLink.create({
      data: {
        userId,
        ref_code: 'amp_jessica954',
        total_clicks: 142
      }
    });
  } else {
    await prisma.affiliateLink.update({
      where: { id: link.id },
      data: { total_clicks: 142 }
    });
  }

  // Seed Leads
  const vehicle = await prisma.vehicle.findFirst();
  if (vehicle) {
    await prisma.lead.createMany({
      data: [
        {
          storeId: 'auto-money-fl',
          customerName: 'John Doe',
          customerPhone: '555-0192',
          customerEmail: 'john.doe@example.com',
          status: 'CONTACTED',
          amp_affiliate_id: userId,
          vehicleId: vehicle.id,
          source: 'AMP_AFFILIATE',
          is_buy_now: false
        },
        {
          storeId: 'auto-money-fl',
          customerName: 'Sarah Smith',
          customerPhone: '555-9988',
          customerEmail: 'sarah.s@example.com',
          status: 'DEAL_PENDING',
          amp_affiliate_id: userId,
          vehicleId: vehicle.id,
          source: 'AMP_AFFILIATE',
          is_buy_now: true
        }
      ]
    });
  }

  // Seed Commission
  await prisma.commission.create({
    data: {
      affiliateId: userId,
      dealId: 'dummy-deal-123',
      amount: 250,
      status: 'PENDING'
    }
  });

  console.log('Seeded AMP Stats'); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
