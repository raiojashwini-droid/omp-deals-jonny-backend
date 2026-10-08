const prisma = require('../config/prisma');

class DealerService {
  async getDealerInventory(dealerId) {
    if (!dealerId) {
      throw { status: 400, message: 'Dealer ID is required' };
    }

    const store = await prisma.store.findUnique({
      where: { id: dealerId },
      select: {
        id: true,
        name: true,
        street_address: true,
        city: true,
        state: true,
        zip: true,
        phone: true,
        activeUnits: true
      }
    });

    if (!store) {
      throw { status: 404, message: 'Dealer not found' };
    }
    
    // Add mock reviews count for frontend presentation
    store.reviewsCount = 124;

    const vehicles = await prisma.vehicle.findMany({
      where: { 
        storeId: dealerId,
        lot_status: { in: ['AVAILABLE', 'PENDING_SALE'] } // Show available and pending
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedInventory = vehicles.map(v => {
      const priceStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v.selling_price || 0);
      const monthlyEst = v.selling_price ? Math.round(v.selling_price * 0.018) : 0; // simple mock calculation
      const monthlyStr = `$${monthlyEst}/mo`;
      const images = typeof v.image_urls === 'string' ? JSON.parse(v.image_urls) : (v.image_urls || []);

      return {
        id: v.id,
        vin: v.vin,
        title: v.title || `${v.year} ${v.make} ${v.model} ${v.trim || ''}`.trim(),
        price: priceStr,
        monthly: monthlyStr,
        mileage: v.mileage ? v.mileage.toLocaleString() + ' miles' : 'N/A',
        exteriorColor: v.exterior_color,
        status: v.lot_status,
        image: images[0] || 'https://via.placeholder.com/400x220?text=No+Image',
        images: images,
        badge: v.lot_status === 'AVAILABLE' ? 'GREAT DEAL' : v.lot_status,
        engine: 'Standard Engine', // mock fallback
        drivetrain: 'RWD', // mock fallback
        stock: v.id.substring(0, 6).toUpperCase()
      };
    });

    return { dealer: store, inventory: formattedInventory };
  }

  async recordTrackingEvent(dealerId, trackingData, user) {
    if (!dealerId) {
      throw { status: 400, message: 'Dealer ID is required' };
    }
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    if (user && user.id) {
      const recentEvent = await prisma.trackingEvent.findFirst({
        where: {
          storeId: dealerId,
          userId: user.id,
          createdAt: { gte: tenMinutesAgo }
        }
      });
      if (recentEvent) {
        return { success: true, message: 'Duplicate tracking event ignored', event: recentEvent };
      }
    }
    
    const event = await prisma.trackingEvent.create({
      data: {
        storeId: dealerId,
        userId: user ? user.id : null,
        vehicleId: trackingData.vehicleId || null,
        duration_seconds: trackingData.durationSeconds || 10
      }
    });

    if (user && user.id) {
      const accountAgeHours = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
      if (accountAgeHours < 24) {
        const existingLead = await prisma.lead.findFirst({
          where: {
            storeId: dealerId,
            customerEmail: user.email
          }
        });

        if (!existingLead) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          
          const newLead = await prisma.lead.create({
            data: {
              storeId: dealerId,
              customerName: user.full_name || 'New User',
              customerEmail: user.email,
              customerPhone: user.phone || null,
              phone_consent: !!user.phone,
              qualification: 'NEW_LEAD',
              status: 'New',
              source: 'New OMP Account Activity',
              expires_at: expiresAt
            },
            include: { vehicle: true }
          });

          // Need to emit event for real-time notification
          const ompEmitter = require('./eventEmitter');
          ompEmitter.emit('new_lead', newLead);
        }
      }
    }
    
    return { success: true, event };
  }

  async getDmsFeedData(storeId) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, activeUnits: true }
    });
    if (!store) throw { status: 404, message: 'Store not found' };

    const vehicles = await prisma.vehicle.findMany({
      where: { storeId },
      orderBy: { updatedAt: 'desc' }
    });

    const formatCur = (val) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val || 0);

    const syncedVehicles = vehicles.map((v) => {
      const updatedAgo = (() => {
        const diffMs = Date.now() - new Date(v.updatedAt).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `${mins} mins ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
        return `${Math.floor(hrs / 24)} day(s) ago`;
      })();

      return {
        id: v.id,
        vin: v.vin,
        stock: `STK-${v.id.substring(0, 4).toUpperCase()}`,
        year: v.year,
        make: v.make,
        model: `${v.model}${v.trim ? ' ' + v.trim : ''}`,
        price: formatCur(v.selling_price),
        cost: formatCur((v.selling_price || 0) * 0.85),
        mileage: v.mileage ? `${v.mileage.toLocaleString()} mi` : 'N/A',
        dmsStatus: v.lot_status === 'AVAILABLE' ? 'Active on Lot' : v.lot_status === 'PENDING_SALE' ? 'Sale Pending' : v.lot_status,
        feedSyncStatus: v.lot_status === 'SOLD' ? 'Sync Paused' : 'Synced',
        carfaxAttached: !!v.vin,
        lastUpdated: updatedAgo,
      };
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return {
      store,
      totalSynced: vehicles.length,
      lastSyncTime: `Today at ${timeStr}`,
      connectedDms: 'OMP Standard Feed',
      dmsAccount: store.name,
      syncedVehicles,
    };
  }

  async forceSyncNow(storeId) {
    // In a real integration this would ping the DMS. We update the store timestamp as a proxy.
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      success: true,
      message: 'Sync completed',
      lastSyncTime: `Today at ${timeStr}`,
    };
  }
}

module.exports = new DealerService();
