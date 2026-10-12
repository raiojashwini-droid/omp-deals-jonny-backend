require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SAMPLE_LISTINGS = [
  // ── 1. FOR SALE: ELECTRONICS ───────────────────────────────────────────────
  {
    title: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
    category: 'electronics',
    selling_price: 2499,
    location: 'Fort Lauderdale, FL',
    body_class: 'Electronics',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'ELEC-MBP16-M3'
  },
  {
    title: 'Sony PlayStation 5 Disc Edition + 2 DualSense Controllers',
    category: 'electronics',
    selling_price: 450,
    location: 'Miami, FL',
    body_class: 'Gaming Console',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'ELEC-PS5-DISC'
  },
  {
    title: 'Sony Alpha A7 IV Full-Frame Mirrorless Camera + 24-70mm Lens',
    category: 'electronics',
    selling_price: 2150,
    location: 'Boca Raton, FL',
    body_class: 'Camera & Photo',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'ELEC-SONY-A7IV'
  },

  // ── 2. FOR SALE: HOME & GARDEN ─────────────────────────────────────────────
  {
    title: 'Restoration Hardware Cloud Modular 4-Piece Sectional Sofa',
    category: 'home_garden',
    selling_price: 2850,
    location: 'Fort Lauderdale, FL',
    body_class: 'Furniture',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'HOME-RH-CLOUD'
  },
  {
    title: 'DeWalt 20V MAX Cordless Power Tool Combo Kit (6-Tool Set)',
    category: 'home_garden',
    selling_price: 380,
    location: 'Hollywood, FL',
    body_class: 'Tools & Hardware',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'HOME-DEWALT-20V'
  },

  // ── 3. FOR SALE: CLOTHING, SHOES & JEWELRY ─────────────────────────────────
  {
    title: 'Nike Air Jordan 1 Retro High OG "Chicago" (Size 10.5 Men)',
    category: 'clothing',
    selling_price: 340,
    location: 'Miami, FL',
    body_class: 'Sneakers & Shoes',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'CLOTH-AJ1-CHI'
  },
  {
    title: 'Rolex Submariner Date 41mm Stainless Steel Oyster (Ref 126610LN)',
    category: 'clothing',
    selling_price: 12400,
    location: 'Palm Beach, FL',
    body_class: 'Luxury Watches',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'CLOTH-ROLEX-SUB'
  },

  // ── 4. FOR SALE: BABY & KIDS ───────────────────────────────────────────────
  {
    title: 'UPPAbaby Vista V2 Stroller System + Bassinet & Car Seat',
    category: 'baby_kids',
    selling_price: 680,
    location: 'Coral Gables, FL',
    body_class: 'Strollers & Gear',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'BABY-UPPA-VISTA'
  },

  // ── 5. FOR SALE: TOYS, GAMES & HOBBIES ─────────────────────────────────────
  {
    title: 'LEGO Star Wars Millennium Falcon Ultimate Collector Series 75192',
    category: 'toys',
    selling_price: 720,
    location: 'Fort Lauderdale, FL',
    body_class: 'Collectibles',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'TOYS-LEGO-75192'
  },

  // ── 6. AI CARS & TRUCKS: ADDITIONAL POPULAR INVENTORY ──────────────────────
  {
    title: '2023 Ford F-150 Lightning Lariat Extended Range AWD Crew Cab',
    category: 'cars_trucks',
    selling_price: 54900,
    location: 'Fort Lauderdale, FL',
    body_class: 'Pickup Truck',
    make: 'Ford',
    model: 'F-150 Lightning',
    year: 2023,
    mileage: 14200,
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1605893477799-b99e3b7b905d?w=800']),
    lot_status: 'AVAILABLE',
    vin: '1FT6W1EV9PW102834'
  },
  {
    title: '2022 Porsche 911 Carrera S Coupe (Sport Chrono)',
    category: 'cars_trucks',
    selling_price: 118500,
    location: 'Miami, FL',
    body_class: 'Coupe',
    make: 'Porsche',
    model: '911 Carrera S',
    year: 2022,
    mileage: 9800,
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'WP0AB2A93NS248102'
  },
  {
    title: '2022 Freightliner M2 106 26ft Box Truck with Tuckaway Liftgate',
    category: 'commercial_vehicles',
    selling_price: 68000,
    location: 'Miami, FL',
    body_class: 'Box Truck',
    make: 'Freightliner',
    model: 'M2 106',
    year: 2022,
    mileage: 48500,
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800']),
    lot_status: 'AVAILABLE',
    vin: '1FVACWDT8NHJA1902'
  },

  // ── 7. SERVICES (LOCAL DIRECTORY) ──────────────────────────────────────────
  {
    title: 'Licensed Master Electrician & EV Fast Charger Installation',
    category: 'services:electrical',
    selling_price: 120,
    location: 'Fort Lauderdale, FL',
    body_class: 'Electrician Pro',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'SERV-ELEC-PRO'
  },
  {
    title: 'Emergency 24/7 Residential & Commercial Plumbing & Drain Clean',
    category: 'services:plumbing',
    selling_price: 95,
    location: 'Miami, FL',
    body_class: 'Plumbing Expert',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'SERV-PLUMB-PRO'
  },
  {
    title: 'Premier Swimming Pool Cleaning & Salt Water System Maintenance',
    category: 'services:pool',
    selling_price: 140,
    location: 'Boca Raton, FL',
    body_class: 'Pool Care',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'SERV-POOL-CARE'
  },

  // ── 8. JOB FINDER ──────────────────────────────────────────────────────────
  {
    title: 'Automotive Dealership Sales Manager (Auto Money South FL)',
    category: 'jobs:automotive',
    selling_price: 125000,
    location: 'Fort Lauderdale, FL',
    body_class: 'Automotive Career',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1552664730-d307ca884978?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'JOB-AUTO-MGR'
  },
  {
    title: 'Full Stack Node.js / React AI Software Engineer (Remote)',
    category: 'jobs:ai_software',
    selling_price: 145000,
    location: 'Fort Lauderdale, FL (Remote OK)',
    body_class: 'Tech Career',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'JOB-TECH-DEV'
  },

  // ── 9. REAL ESTATE: RENT & BUY ─────────────────────────────────────────────
  {
    title: 'Luxury 2-Bedroom Oceanfront Condo at Las Olas Beach Club',
    category: 'real_estate:rent',
    selling_price: 4200,
    location: 'Fort Lauderdale, FL',
    body_class: 'Condo Rental',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'RE-CONDO-LASOLAS'
  },
  {
    title: 'Modern 4-Bedroom Single Family Home with Private Pool',
    category: 'real_estate:buy',
    selling_price: 875000,
    location: 'Coral Ridge, Fort Lauderdale, FL',
    body_class: 'Single Family Sale',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'RE-HOME-CORAL'
  },

  // ── 10. LOOKING FOR ────────────────────────────────────────────────────────
  {
    title: 'BUYER REQUEST: Seeking 1968-1969 Dodge Charger 440 R/T (Clean Title)',
    category: 'looking_for:cars_trucks',
    selling_price: 55000,
    location: 'Miami, FL',
    body_class: 'Buyer Demand',
    image_urls: JSON.stringify(['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800']),
    lot_status: 'AVAILABLE',
    vin: 'REQ-CHARGER-69'
  }
];

async function seedMarketplace() {
  console.log('📦 Seeding Rich Marketplace Data across All Menu Categories...');
  
  const store = await prisma.store.findFirst({ where: { id: 'auto-money-fl' } });
  const storeId = store ? store.id : null;

  for (const item of SAMPLE_LISTINGS) {
    await prisma.vehicle.upsert({
      where: { vin: item.vin },
      update: {
        title: item.title,
        category: item.category,
        selling_price: item.selling_price,
        location: item.location,
        body_class: item.body_class,
        image_urls: item.image_urls,
        lot_status: 'AVAILABLE'
      },
      create: {
        storeId,
        vin: item.vin,
        title: item.title,
        category: item.category,
        selling_price: item.selling_price,
        location: item.location,
        body_class: item.body_class,
        make: item.make || null,
        model: item.model || null,
        year: item.year || null,
        mileage: item.mileage || 0,
        image_urls: item.image_urls,
        lot_status: 'AVAILABLE',
        truYou: true
      }
    });
    console.log(`✅ Seeded [${item.category}]: ${item.title}`);
  }

  console.log('\n🎉 All Menu Categories Seeded Successfully with Live Data!');
}

seedMarketplace()
  .catch(err => console.error('Seed Error:', err))
  .finally(() => prisma.$disconnect());
