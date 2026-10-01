require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const PASSWORD = 'SouthFL@2026';

const USERS = [
  {
    id: 'user-liaison-001',
    full_name: 'Elena Rostova',
    email: 'liaison@automoneyfl.com',
    role: 'LIAISON',
    badge: 'OMP Platform Mgr',
    defaultRoute: '/omp/crm/liaison',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-salesrep-001',
    full_name: 'Tony Ramirez',
    email: 'tony.rep@automoneyfl.com',
    role: 'SALES_REP',
    badge: 'Sales Rep',
    defaultRoute: '/omp/crm/rep-inbox',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-salesmgr-001',
    full_name: 'Carlos Vega',
    email: 'carlos.mgr@automoneyfl.com',
    role: 'SALES_MGR',
    badge: 'Sales Manager',
    defaultRoute: '/omp/crm/manager',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-dealerpro-001',
    full_name: 'Marcus Vance',
    email: 'marcus@automoneyfl.com',
    role: 'DEALER_PRO',
    badge: 'Auto Dealership',
    defaultRoute: '/omp/verified-dealer',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-broker-001',
    full_name: 'Devon Miller',
    email: 'devon.broker@southfloridacars.com',
    role: 'BROKER',
    badge: 'Auto Broker',
    defaultRoute: '/omp/crm/broker',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-amp-001',
    full_name: 'Jessica Morales',
    email: 'jessica.amp@autobuzz.com',
    role: 'AMP_AFFILIATE',
    badge: 'AMP Affiliate',
    defaultRoute: '/omp/crm/amp',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-exec-001',
    full_name: 'Alexander Wright',
    email: 'alexander.wright@ompdeals.com',
    role: 'EXECUTIVE_ADMIN',
    badge: 'Executive Admin',
    defaultRoute: '/omp/executive/central-office',
    storeId: 'auto-money-fl',
  },
  {
    id: 'user-member-001',
    full_name: 'Sarah Jenkins',
    email: 'member@ompdeals.com',
    role: 'MEMBER',
    badge: 'Verified Member',
    defaultRoute: '/member/dashboard',
    storeId: null,
  },
  {
    id: 'user-guest-001',
    full_name: 'Carlos Gomez',
    email: 'buyer@southflorida.com',
    role: 'GUEST',
    badge: 'Car Buyer / Seller',
    defaultRoute: '/',
    storeId: null,
  },
];

async function main() {
  console.log('🌱 Starting full seed...\n');

  // ── STORE ──────────────────────────────────────────────────────────────────
  await prisma.store.upsert({
    where: { id: 'auto-money-fl' },
    update: { activeUnits: 42 },
    create: {
      id: 'auto-money-fl',
      name: 'Auto Money Motorcars LLC',
      dba: 'Auto Money',
      street_address: '1450 SE 17th St',
      city: 'Fort Lauderdale',
      state: 'FL',
      zip: '33316',
      phone: '(954) 555-0182',
      is_pilot_dealer: true,
      activeUnits: 42,
    },
  });
  console.log('✅ Store: Auto Money Motorcars LLC');

  // ── VEHICLES ───────────────────────────────────────────────────────────────
  await prisma.vehicle.upsert({
    where: { vin: '1G1YC2D40R5102948' },
    update: {},
    create: {
      storeId: 'auto-money-fl',
      vin: '1G1YC2D40R5102948',
      year: 2024,
      make: 'Chevrolet',
      model: 'Corvette',
      trim: 'Stingray 2LT Coupe',
      body_class: 'Coupe',
      selling_price: 79900,
      mileage: 3210,
      exterior_color: 'Rapid Blue',
      transmission: 'Automatic',
      location: 'Fort Lauderdale, FL',
      lot_status: 'AVAILABLE',
      image_urls: JSON.stringify([
        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800',
      ]),
    },
  });

  await prisma.vehicle.upsert({
    where: { vin: '5YJSA1E26MF123456' },
    update: {},
    create: {
      storeId: 'auto-money-fl',
      vin: '5YJSA1E26MF123456',
      year: 2023,
      make: 'Tesla',
      model: 'Model S',
      trim: 'Plaid',
      body_class: 'Sedan',
      selling_price: 89500,
      mileage: 8120,
      exterior_color: 'Pearl White',
      location: 'Fort Lauderdale, FL',
      lot_status: 'AVAILABLE',
      image_urls: JSON.stringify([
        'https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800',
      ]),
    },
  });

  await prisma.vehicle.upsert({
    where: { vin: 'WBA3A5G50ENS09187' },
    update: {},
    create: {
      storeId: 'auto-money-fl',
      vin: 'WBA3A5G50ENS09187',
      year: 2024,
      make: 'BMW',
      model: 'M4',
      trim: 'Competition xDrive',
      body_class: 'Coupe',
      selling_price: 86400,
      mileage: 3200,
      exterior_color: 'Isle of Man Green',
      location: 'Fort Lauderdale, FL',
      lot_status: 'AVAILABLE',
      image_urls: JSON.stringify([
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
      ]),
    },
  });
  console.log('✅ Vehicles: 3 seeded');

  // ── USERS ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, is_active: true },
      create: {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        badge: u.badge,
        defaultRoute: u.defaultRoute,
        passwordHash,
        is_active: true,
        storeId: u.storeId,
      },
    });
    console.log(`✅ User [${u.role.padEnd(15)}]: ${u.email}`);
  }

  // ── AMP AFFILIATE LINK ─────────────────────────────────────────────────────
  const ampUser = await prisma.user.findUnique({ where: { email: 'jessica.amp@autobuzz.com' } });
  if (ampUser) {
    await prisma.affiliateLink.upsert({
      where: { ref_code: 'amp_jessica954' },
      update: {},
      create: {
        userId: ampUser.id,
        ref_code: 'amp_jessica954',
        commission_rate: 250.00,
        total_clicks: 0,
        total_sales: 0,
        total_commission_paid: 0,
      },
    });
    console.log('✅ AMP Affiliate Link seeded for Jessica Morales');
  }

  // ── POLICE SAFE SPOTS ─────────────────────────────────────────────────────
  await prisma.policeSafeSpot.upsert({
    where: { id: 'spot-broward-001' },
    update: {},
    create: {
      id: 'spot-broward-001',
      department_name: 'Fort Lauderdale Police Department',
      street_address: '1300 W Broward Blvd',
      city: 'Fort Lauderdale',
      state: 'FL',
      zip: '33312',
      latitude: 26.1224,
      longitude: -80.1701,
      surveillance_247: true,
    },
  });

  await prisma.policeSafeSpot.upsert({
    where: { id: 'spot-miami-001' },
    update: {},
    create: {
      id: 'spot-miami-001',
      department_name: 'Miami-Dade Police Department HQ',
      street_address: '9105 NW 25th St',
      city: 'Miami',
      state: 'FL',
      zip: '33172',
      latitude: 25.7959,
      longitude: -80.3403,
      surveillance_247: true,
    },
  });

  await prisma.policeSafeSpot.upsert({
    where: { id: 'spot-pompano-001' },
    update: {},
    create: {
      id: 'spot-pompano-001',
      department_name: 'Pompano Beach Police Department',
      street_address: '100 SW 3rd St',
      city: 'Pompano Beach',
      state: 'FL',
      zip: '33060',
      latitude: 26.2379,
      longitude: -80.1248,
      surveillance_247: true,
    },
  });
  console.log('✅ Police Safe Spots: 3 seeded (Fort Lauderdale, Miami, Pompano Beach)');

  console.log('\n🎉 SEED COMPLETE! All data ready.');
  console.log(`\n📋 Login with: Password = "${PASSWORD}" for all users\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
