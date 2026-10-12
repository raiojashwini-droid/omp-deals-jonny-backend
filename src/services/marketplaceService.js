const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MarketplaceService {
  async getListings(filters) {
    const { category, location, minPrice, maxPrice, bodyStyle, q } = filters;
    
    // Build the Prisma "where" clause dynamically
    let where = {
      lot_status: 'AVAILABLE' // Only show available inventory
    };

    const categoryAliases = {
      vehicles: ['vehicles', 'cars_trucks'],
      cars_trucks: ['cars_trucks', 'vehicles'],
      commercial_vehicles: ['commercial_vehicles', 'commercial'],
      work_vans: ['work_vans', 'van'],
      family_vans: ['family_vans', 'van'],
      suvs: ['suvs', 'suv'],
      motorcycles: ['motorcycles', 'motorcycle'],
      boats_marine: ['boats_marine', 'boat'],
      campers_rvs: ['campers_rvs', 'rv', 'camper'],
      auto_parts_accessories: ['auto_parts_accessories', 'auto_parts'],
      powersport_vehicles: ['powersport_vehicles', 'powersport'],
      tires_rims: ['tires_rims'],
      trailers: ['trailers', 'trailer'],
      other_vehicles: ['other_vehicles'],
      baby_supplies_gear: ['baby_supplies_gear', 'baby_kids'],
      baby_kids: ['baby_kids', 'baby_supplies_gear'],
      baby_gear: ['baby_gear', 'baby_supplies_gear', 'baby_kids'],
      baby_safety: ['baby_safety'],
      bathing_skincare: ['bathing_skincare'],
      baby_toys: ['baby_toys'],
      boys_accessories: ['boys_accessories'],
      girls_accessories: ['girls_accessories'],
      car_seats_strollers_accessories: ['car_seats_strollers_accessories', 'baby_supplies_gear'],
      diapering_potty_training: ['diapering_potty_training'],
      feeding_nurturing: ['feeding_nurturing'],
      health_baby_care: ['health_baby_care'],
      nursery_furniture_decor: ['nursery_furniture_decor'],
      pregnancy_maternity: ['pregnancy_maternity'],
      other_baby_kids: ['other_baby_kids'],
      clothing: ['clothing', 'clothing_shoes_accessories'],
      clothing_shoes_accessories: ['clothing', 'clothing_shoes_accessories'],
      baby_toddler_accessories: ['baby_toddler_accessories'],
      baby_toddler_boys_clothing: ['baby_toddler_boys_clothing'],
      baby_toddler_girls_clothing: ['baby_toddler_girls_clothing'],
      boys_clothing_accessories: ['boys_clothing_accessories'],
      boys_shoes: ['boys_shoes', 'shoes'],
      girls_clothing_accessories: ['girls_clothing_accessories'],
      girls_shoes: ['girls_shoes', 'shoes'],
      jewelry_accessories: ['jewelry_accessories'],
      men_clothing_accessories: ['men_clothing_accessories'],
      men_shoes: ['men_shoes', 'shoes'],
      women_clothing_accessories: ['women_clothing_accessories'],
      women_shoes: ['women_shoes', 'shoes'],
      other_clothing_accessories: ['other_clothing_accessories'],
      electronics: ['electronics', 'electronics_media'],
      electronics_media: ['electronics', 'electronics_media'],
      '3d_printers_supplies': ['3d_printers_supplies'],
      audio_speakers: ['audio_speakers'],
      books_movies_music: ['books_movies_music'],
      cameras_photography: ['cameras_photography'],
      cell_phones_accessories: ['cell_phones_accessories'],
      computers_laptops_accessories: ['computers_laptops_accessories'],
      drones: ['drones'],
      tvs_media_players: ['tvs_media_players'],
      video_games_consoles: ['video_games_consoles', 'video_games', 'games_toys'],
      wearables: ['wearables'],
      virtual_reality: ['virtual_reality'],
      other_electronics_media: ['other_electronics_media'],
      video_games: ['video_games', 'games_toys'],
      collectibles: ['collectibles', 'collectibles_arts'],
      wedding_supplies: ['wedding_supplies', 'wedding'],
      fitness_sports_equipment: ['fitness_sports_equipment', 'sports_outdoors'],
      home_goods: ['home_goods', 'home_garden'],
      home_garden: ['home_garden', 'home_goods', 'furniture', 'appliances'],
      bathroom: ['bathroom', 'home_goods', 'home_garden'],
      gadgets_video_cameras: ['gadgets_video_cameras', 'electronics'],
      home_decor: ['home_decor', 'home_goods', 'home_garden'],
      home_improvement: ['home_improvement', 'tools', 'home_goods'],
      household: ['household', 'home_goods', 'appliances'],
      kitchen_dinning: ['kitchen_dinning', 'home_goods', 'appliances'],
      lawn_garden: ['lawn_garden', 'home_goods', 'tools'],
      tools_machinery: ['tools_machinery', 'tools'],
      other_home_garden: ['other_home_garden', 'home_goods', 'home_garden'],
      toys: ['toys', 'games_toys', 'toys_games_hobbies'],
      toys_games_hobbies: ['toys_games_hobbies', 'toys', 'games_toys'],
      costumes_accessories_props: ['costumes_accessories_props'],
      games_hobbies_puzzles: ['games_hobbies_puzzles', 'toys', 'games_toys'],
      outdoor_toys_games: ['outdoor_toys_games', 'toys', 'games_toys'],
      stuffed_plush_toy: ['stuffed_plush_toy', 'toys', 'games_toys'],
      trading_cards_memorabilia: ['trading_cards_memorabilia', 'sports_cards', 'collectibles'],
      musical_instruments: ['musical_instruments'],
      other_toys_games_hobbies: ['other_toys_games_hobbies', 'toys', 'games_toys'],
    };

    if (category) {
      if (category.startsWith('looking_for')) {
        // Querying Looking For demand requests specifically
        where.category = { startsWith: category };
      } else if (category.startsWith('services')) {
        // Querying Services directory specifically
        where.category = { startsWith: category };
      } else if (category.startsWith('jobs')) {
        // Querying Jobs directory specifically (e.g. 'jobs' or 'jobs:healthcare')
        where.category = { startsWith: category };
      } else if (category.startsWith('real_estate')) {
        // Querying Real Estate directory specifically (e.g. 'real_estate' or 'real_estate:rent_apartments')
        where.category = { startsWith: category };
      } else if (category.startsWith('business')) {
        // Querying Business For Sale directory specifically (e.g. 'business_for_sale' or 'business')
        where.category = { startsWith: category };
      } else if (categoryAliases[category]) {
        where.category = { in: categoryAliases[category] };
      } else {
        where.category = category;
      }
    } else {
      // Ordinary general listings feed: exclude looking_for, services, jobs, real_estate, and business listings
      where.NOT = [
        { category: { startsWith: 'looking_for' } },
        { category: { startsWith: 'services' } },
        { category: { startsWith: 'jobs' } },
        { category: { startsWith: 'real_estate' } },
        { category: { startsWith: 'business' } }
      ];
    }

    if (location) {
      where.location = {
        contains: location
      };
    }

    if (bodyStyle) {
      where.body_class = {
        contains: bodyStyle
      };
    }

    if (minPrice || maxPrice) {
      where.selling_price = {};
      if (minPrice) where.selling_price.gte = parseFloat(minPrice);
      if (maxPrice) where.selling_price.lte = parseFloat(maxPrice);
    }

    if (q) {
      if (q.includes(' or ')) {
        const parts = q.split(/\s+or\s+/i).map(p => p.trim()).filter(Boolean);
        where.OR = parts.flatMap(part => [
          { title: { contains: part } },
          { make: { contains: part } },
          { model: { contains: part } }
        ]);
      } else {
        where.OR = [
          { title: { contains: q } },
          { make: { contains: q } },
          { model: { contains: q } }
        ];
      }
    }

    const [total, vehicles] = await prisma.$transaction([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Format data to match API.md specifications
    const data = vehicles.map(v => {
      const priceStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v.selling_price || 0);
      let images = [];
      try {
        images = typeof v.image_urls === 'string' ? JSON.parse(v.image_urls) : (v.image_urls || []);
      } catch (e) {
        images = [];
      }
      const isAdpVerified = v.store ? true : false;

      return {
        id: v.id,
        vin: v.vin,
        title: v.title || `${v.year} ${v.make} ${v.model} ${v.trim || ''}`.trim(),
        price: priceStr,
        monthlyEstimate: v.selling_price ? Math.round((v.selling_price * 0.9 * 0.017) + (v.selling_price * 0.9 / 72)) : 0,
        mileage: v.mileage ? v.mileage.toLocaleString() + ' miles' : 'N/A',
        exteriorColor: v.exterior_color,
        location: v.location || (v.store ? `${v.store.city}, ${v.store.state}` : 'N/A'),
        dealerId: v.storeId,
        seller: v.store ? v.store.name : 'Private Seller',
        sellerType: isAdpVerified ? 'ADP_VERIFIED' : 'TRU_YOU',
        sellerTier: 'ELITE', // Mock tier
        shippingEligible: true, // Mock
        leadStatus: 'NEW MATCH', // Mock
        category: v.category || 'general',
        condition: 'Like New (Direct from Seller)',
        truYou: v.truYou || isAdpVerified,
        posterId: v.posterId || null,
        posted: 'Just now', // Mock
        image: images[0] || 'https://via.placeholder.com/400x220?text=No+Image',
        images: images
      };
    });

    return { total, data };
  }

  async createListing(data, user) {
    if (!data.title || !data.price) {
      throw { status: 400, message: 'Title and price are required' };
    }

    const priceNum = typeof data.price === 'number' 
      ? data.price 
      : parseFloat(String(data.price || '0').replace(/[^0-9.]/g, '')) || 0;

    // Process Base64 images to save to disk and avoid MySQL max_allowed_packet crashes
    let processedPhotos = [];
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create upload directory:', err);
      }
    }

    // Enforce maximum photos count limit (max 10 images)
    const rawPhotos = Array.isArray(data.photos) ? data.photos.slice(0, 10) : [];
    if (rawPhotos.length > 0) {
      processedPhotos = rawPhotos.map(photo => {
        if (typeof photo === 'string' && photo.startsWith('data:image/')) {
          try {
            const matches = photo.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const rawSubtype = matches[1].toLowerCase();
              const allowedExtensions = {
                'jpeg': 'jpg',
                'jpg': 'jpg',
                'png': 'png',
                'webp': 'webp',
                'gif': 'gif'
              };
              const extension = allowedExtensions[rawSubtype];
              if (!extension) {
                console.warn(`Unsupported image subtype ${rawSubtype}, skipping base64 write`);
                return photo;
              }

              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, 'base64');

              // Enforce 10MB individual file size limit and non-empty buffer
              if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
                console.warn('Image size zero or exceeds 10MB limit, skipping file write');
                return photo;
              }

              // Magic byte / file signature verification
              // JPEG: FF D8 FF
              // PNG: 89 50 4E 47 (0x89, 'P', 'N', 'G')
              // GIF: 47 49 46 38 ('G', 'I', 'F', '8')
              // WEBP: 52 49 46 46 ... 57 45 42 50 ('RIFF'...'WEBP')
              const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
              const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
              const isGif = buffer.length >= 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
              const isWebp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

              let verifiedExtension = null;
              if (isJpeg) verifiedExtension = 'jpg';
              else if (isPng) verifiedExtension = 'png';
              else if (isGif) verifiedExtension = 'gif';
              else if (isWebp) verifiedExtension = 'webp';

              if (!verifiedExtension) {
                console.warn('File bytes do not match valid image signature (magic bytes rejected), skipping');
                return photo;
              }

              const fileName = `img_${crypto.randomBytes(8).toString('hex')}.${verifiedExtension}`;
              const filePath = path.join(uploadDir, fileName);
              fs.writeFileSync(filePath, buffer);
              return `/uploads/${fileName}`; // Return root-relative URL for frontend & CDN consistency
            }
          } catch (err) {
            console.error('Error saving image:', err);
          }
        }
        return photo; // If not base64 or failed, return original
      });
    }

    let storeIdToUse = user ? user.storeId : null;

    if (user && user.role === 'EXECUTIVE_ADMIN' && data.storeId) {
      const store = await prisma.store.findFirst({
        where: { id: data.storeId, organizationId: user.organizationId }
      });
      if (!store) {
        throw { status: 403, message: 'Unauthorized store' };
      }
      storeIdToUse = data.storeId;
    } else if (user && user.role === 'EXECUTIVE_ADMIN' && !data.storeId) {
      // If executive doesn't specify, we can't reliably guess which store if they have multiple.
      // But we will allow null (private seller) or their primary storeId if set.
      storeIdToUse = user.storeId || null;
    }

    // Safely store specific subCategory if provided
    let categoryToStore = null;
    if (data.category === 'looking_for') {
      categoryToStore = data.subCategory ? `looking_for:${data.subCategory}` : 'looking_for';
    } else if (data.category === 'services' || data.isService) {
      const serviceSub = data.serviceCategory || data.subCategory;
      categoryToStore = serviceSub ? `services:${serviceSub}` : 'services';
    } else if (data.category === 'jobs' || data.isJob) {
      const jobSub = data.jobCategory || data.subCategory;
      categoryToStore = jobSub ? `jobs:${jobSub}` : 'jobs';
    } else if (data.category === 'real_estate' || data.isRealEstate) {
      const reSub = data.realEstateCategory || data.subCategory;
      categoryToStore = reSub ? `real_estate:${reSub}` : 'real_estate';
    } else if (data.category === 'business_for_sale' || data.isBusiness) {
      const bizSub = data.businessCategory || data.subCategory;
      categoryToStore = bizSub ? `business_for_sale:${bizSub}` : 'business_for_sale';
    } else {
      categoryToStore = data.category || null;
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        title: data.title,
        selling_price: isNaN(priceNum) ? 0 : priceNum,
        category: categoryToStore,
        location: data.location,
        image_urls: JSON.stringify(processedPhotos),
        lot_status: 'AVAILABLE',
        posterId: user ? user.id : null,
        storeId: storeIdToUse
      }
    });

    return {
      id: newVehicle.id,
      title: newVehicle.title,
      price: data.price,
      category: newVehicle.category || data.category,
      location: newVehicle.location,
      image: (data.photos && data.photos.length > 0) ? data.photos[0] : null,
      listingNumber: `OMP-${newVehicle.id.substring(0, 5).toUpperCase()}`
    };
  }

  async verifyVehicleAccess(vehicleId, user) {
    if (!user) return false;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { store: true }
    });
    if (!vehicle) return false;

    if (user.role === 'EXECUTIVE_ADMIN') {
      if (vehicle.store && vehicle.store.organizationId === user.organizationId) {
        return true;
      }
      return false; // Can't edit private seller items unless they posted it?
    }
    
    // Normal dealer user
    if (vehicle.storeId && vehicle.storeId === user.storeId) {
      return true;
    }
    // Owner fallback
    if (vehicle.posterId === user.id) {
      return true;
    }
    return false;
  }

  async updateListing(id, data, user) {
    const hasAccess = await this.verifyVehicleAccess(id, user);
    if (!hasAccess) {
      throw { status: 403, message: 'Unauthorized to modify this vehicle' };
    }

    const priceNum = data.price ? parseFloat(data.price.replace(/[^0-9.]/g, '')) : undefined;

    const updateData = {};
    if (data.title) updateData.title = data.title;
    if (data.price) updateData.selling_price = isNaN(priceNum) ? 0 : priceNum;
    if (data.category) updateData.category = data.category;
    if (data.location) updateData.location = data.location;
    if (data.lot_status) updateData.lot_status = data.lot_status;
    
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData
    });

    return updatedVehicle;
  }

  async deleteListing(id, user) {
    const hasAccess = await this.verifyVehicleAccess(id, user);
    if (!hasAccess) {
      throw { status: 403, message: 'Unauthorized to delete this vehicle' };
    }

    await prisma.vehicle.delete({
      where: { id }
    });
    return { success: true };
  }

  async getListingById(id) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            dba: true,
            city: true,
            state: true,
            zip: true,
            phone: true,
            street_address: true,
          }
        }
      }
    });

    if (!vehicle) {
      throw { status: 404, message: 'Listing not found' };
    }

    const priceStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(vehicle.selling_price || 0);
    const images = typeof vehicle.image_urls === 'string' ? JSON.parse(vehicle.image_urls) : (vehicle.image_urls || []);
    const isAdpVerified = !!vehicle.store;
    const sellerName = vehicle.store ? (vehicle.store.dba || vehicle.store.name) : 'Private Seller';

    // Derive engine from body_class or trim (no dedicated engine column in DB)
    const engineDisplay = vehicle.trim || vehicle.body_class || 'See Dealer for Details';
    // Derive color display
    const colorDisplay = vehicle.exterior_color || 'See Listing';
    // Transmission comes from DB (defaults to 'Automatic')
    const transmissionDisplay = vehicle.transmission || 'Automatic';
    // Stock number: use beginning of id as reference
    const stockDisplay = `OMP-${vehicle.id.substring(0, 6).toUpperCase()}`;

    // Safe meetup: prefer store showroom address, else generic
    const safeMeetupLabel = vehicle.store
      ? `${sellerName} Showroom`
      : 'Police Dept - Safe Exchange Lot';
    const safeMeetupAddress = vehicle.store && vehicle.store.street_address
      ? `${vehicle.store.street_address}, ${vehicle.store.city}, ${vehicle.store.state} ${vehicle.store.zip || ''}`
      : null;

    return {
      id: vehicle.id,
      vin: vehicle.vin || 'N/A',
      title: vehicle.title || `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.trim || ''}`.trim() || 'Custom Listing',
      price: priceStr,
      rawPrice: vehicle.selling_price,
      estPayment: vehicle.selling_price ? `$${Math.round((vehicle.selling_price * 0.9 * 0.017) + (vehicle.selling_price * 0.9 / 72)).toLocaleString()} / mo` : 'N/A',
      mileage: vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'N/A',
      exteriorColor: colorDisplay,
      interiorColor: 'See Dealer',
      engine: engineDisplay,
      transmission: transmissionDisplay,
      stock: stockDisplay,
      bodyClass: vehicle.body_class || 'N/A',
      category: vehicle.category || 'car',
      titleStatus: vehicle.titleStatus || 'Clean Title',
      location: vehicle.location || (vehicle.store ? `${vehicle.store.city}, ${vehicle.store.state}` : 'N/A'),
      dealerId: vehicle.storeId,
      seller: sellerName,
      sellerPhone: vehicle.store?.phone || null,
      sellerAddress: safeMeetupAddress,
      sellerType: isAdpVerified ? 'ADP_VERIFIED' : 'TRU_YOU',
      sellerTier: isAdpVerified ? 'franchise' : 'private',
      sellerRating: isAdpVerified ? '4.9 ★ (verified dealer)' : 'TruYou Verified',
      truYou: vehicle.truYou || true,
      safeMeetupSpot: safeMeetupLabel,
      safeMeetupAddress,
      image: images[0] || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1000&auto=format&fit=crop&q=80',
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1000&auto=format&fit=crop&q=80']
    };
  }

  async decodeVin(vin) {
    let vehicle = await prisma.vehicle.findFirst({
      where: { vin },
      include: { store: true }
    });
    
    // If exact VIN not found, just return a random vehicle for demo purposes
    if (!vehicle) {
      vehicle = await prisma.vehicle.findFirst({ include: { store: true }});
    }
    if (!vehicle) {
      throw { status: 404, message: 'No vehicles in database' };
    }

    const price = vehicle.selling_price || 35000;
    const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p);

    return {
      vin: vin, // Keep the requested VIN
      year: vehicle.year || 2022,
      make: vehicle.make || 'Unknown',
      model: vehicle.model || 'Model',
      trim: vehicle.trim || vehicle.body_class || 'Base',
      engine: vehicle.engine || 'Standard Engine',
      transmission: vehicle.transmission || 'Automatic',
      driveType: 'AWD',
      kbbBookout: null, // Market pricing is separate and requires AI pricing module
      historyReport: {
        provider: 'OMP Standard VHR',
        status: 'UNAVAILABLE',
        message: 'No external VHR provider configured.',
        titleStatus: vehicle.titleStatus || 'Unknown',
      },
      lienAndTitle: {
        provider: 'OMP Title Search',
        status: 'UNAVAILABLE',
        message: 'No external title/lien search provider configured.'
      },
      pricing: {
        provider: 'OMP AI Market Pricing',
        status: 'UNAVAILABLE',
        message: 'No external pricing provider configured.',
        marketPrice: vehicle.marketPrice || null,
        askingPrice: price
      }
    };
  }

  async getGlobalStats() {
    try {
      const activeVehiclesCount = await prisma.vehicle.count({
        where: { lot_status: 'AVAILABLE' }
      });
      const totalLeadsCount = await prisma.lead.count();
      return {
        activeUnits: activeVehiclesCount || 0,
        totalLeads: totalLeadsCount || 0
      };
    } catch (err) {
      console.error('getGlobalStats DB Error:', err);
      throw err;
    }
  }

  async getFavorites(userId) {
    if (!userId) throw { status: 401, message: 'Authentication required' };

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        vehicle: {
          include: {
            store: {
              select: { id: true, name: true, city: true, state: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return favorites.map(fav => {
      const v = fav.vehicle;
      let images = [];
      try {
        images = typeof v.image_urls === 'string' ? JSON.parse(v.image_urls) : (v.image_urls || []);
      } catch (e) {
        images = [];
      }
      const priceStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v.selling_price || 0);

      return {
        id: v.id,
        favoriteId: fav.id,
        title: v.title || `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim(),
        price: priceStr,
        category: v.category || 'general',
        location: v.location || (v.store ? `${v.store.city}, ${v.store.state}` : 'Fort Lauderdale, FL'),
        image: images[0] || 'https://via.placeholder.com/400x220?text=Listing',
        condition: 'Verified Listing',
        seller: v.store ? v.store.name : 'Verified Seller',
        createdAt: fav.createdAt
      };
    });
  }

  async addFavorite(userId, vehicleId) {
    if (!userId) throw { status: 401, message: 'Authentication required' };
    if (!vehicleId) throw { status: 400, message: 'vehicleId is required' };

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });
    if (!vehicle) {
      throw { status: 404, message: 'Listing not found' };
    }

    // Upsert or safely find existing
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId
        }
      }
    });

    if (existing) {
      return { success: true, message: 'Already favorited', favorite: existing };
    }

    const created = await prisma.favorite.create({
      data: {
        userId,
        vehicleId
      }
    });

    return { success: true, favorite: created };
  }

  async removeFavorite(userId, vehicleId) {
    if (!userId) throw { status: 401, message: 'Authentication required' };
    if (!vehicleId) throw { status: 400, message: 'vehicleId is required' };

    try {
      await prisma.favorite.delete({
        where: {
          userId_vehicleId: {
            userId,
            vehicleId
          }
        }
      });
      return { success: true, message: 'Favorite removed' };
    } catch (err) {
      // If not found, return safe success
      return { success: true, message: 'Favorite was already removed' };
    }
  }

  async syncGuestFavorites(userId, vehicleIds = []) {
    if (!userId) throw { status: 401, message: 'Authentication required' };
    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) return { success: true, count: 0 };

    let addedCount = 0;
    for (const vid of vehicleIds) {
      try {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } });
        if (vehicle) {
          await prisma.favorite.upsert({
            where: { userId_vehicleId: { userId, vehicleId: vid } },
            update: {},
            create: { userId, vehicleId: vid }
          });
          addedCount++;
        }
      } catch (e) {
        // Continue merging remaining favorites
      }
    }
    return { success: true, addedCount };
  }
}

module.exports = new MarketplaceService();
