const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const loanCategories = [
  {
    name: 'The Money Club for Investors',
    description: 'Powered By Lenders. Click here to join || F R E E ||',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Typical approval Time: 2-24 hours',
    iconName: 'Users' // Lucide icon name
  },
  {
    name: 'Restaurants Loans',
    description: 'Easy Approval Process',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Typical approval Time: 2-24 hours',
    iconName: 'Utensils'
  },
  {
    name: 'Food Truck Loans',
    description: 'Easy Approval Process',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Typical approval Time: 2-24 hours',
    iconName: 'Truck'
  },
  {
    name: 'Buy A Franchise',
    description: 'Buy New or Expansion We Can Help',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Easy Approval Process',
    iconName: 'Store'
  },
  {
    name: 'Dental Practice',
    description: 'Startup, Equipment Upgrades purchases of existing practices',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Easy Approval Process',
    iconName: 'Stethoscope'
  },
  {
    name: 'General Freight and Trucking',
    description: 'Fleet Trucks / Owner Operator',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Typical approval Time: 2-24 hours',
    iconName: 'Truck'
  },
  {
    name: 'HOTELS / MOTELS / AIRBNBs',
    description: 'Buy New, Purchases of Existing Repair, Renovate, Remodel',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Easy Approval Process',
    iconName: 'Building'
  },
  {
    name: 'CHURCH LOANS',
    description: 'Purchases of Existing, Repairs, Renovate Equipment Purchases',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Easy Approval Process',
    iconName: 'Church' // Actually use something like Home or Cross if available
  },
  {
    name: 'FIX & FLIP LOANS',
    description: 'Real Estate Properties',
    creditType: 'GOOD & BAD CREDIT',
    approvalTime: 'Typical approval Time: 2-24 hours',
    iconName: 'Home'
  }
];

async function main() {
  console.log('Seeding loan categories...');
  for (const cat of loanCategories) {
    await prisma.loanCategory.create({
      data: cat
    });
    console.log(`Created ${cat.name}`);
  }
  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
