const prisma = require('../config/prisma');

class SafetyService {
  async getPoliceSafeSpots(filters) {
    const { city, state } = filters;
    const where = {};

    if (city) {
      where.city = { contains: city };
    }
    
    if (state) {
      where.state = state;
    }

    const safeSpots = await prisma.policeSafeSpot.findMany({
      where,
      orderBy: { department_name: 'asc' }
    });

    return safeSpots.map(spot => ({
      id: spot.id,
      name: spot.department_name,
      address: spot.street_address,
      city: spot.city,
      state: spot.state,
      zip: spot.zip,
      latitude: spot.latitude,
      longitude: spot.longitude,
      notes: spot.surveillance_247 ? '24/7 Surveillance' : 'Standard Monitoring',
      isVerified: true
    }));
  }

  calculateShippingEstimate(data) {
    const { originZip, destZip, vehicleClass = 'Standard' } = data;

    if (!originZip || !destZip) {
      throw { status: 400, message: 'Origin and Destination ZIP codes are required' };
    }

    // Mock distance calculation based on basic logic for demo purposes
    // In production, this would call a mapping API (e.g., Google Maps Distance Matrix)
    
    // Very naive pseudo-random distance based on zip codes just for the pilot
    const originNum = parseInt(originZip, 10) || 33316; // default south FL
    const destNum = parseInt(destZip, 10) || 33101;
    const mockDistanceMiles = Math.max(50, Math.abs(originNum - destNum) / 2);

    let baseRatePerMile = 1.00;
    
    switch (vehicleClass.toLowerCase()) {
      case 'suv':
      case 'truck':
        baseRatePerMile = 1.25;
        break;
      case 'exotic':
      case 'classic':
        baseRatePerMile = 2.00; // Enclosed trailer
        break;
      default:
        baseRatePerMile = 1.00;
    }

    const estimatedPrice = Math.max(250, mockDistanceMiles * baseRatePerMile); // Minimum $250 transport

    return {
      originZip,
      destZip,
      vehicleClass,
      estimatedMiles: Math.round(mockDistanceMiles),
      estimatedPrice: Math.round(estimatedPrice)
    };
  }

  async bookShipping(data) {
    const { userId, originZip, destZip, carrierType, estimatedPrice, estimatedMiles } = data;
    
    if (!userId || !originZip || !destZip || !carrierType) {
      throw { status: 400, message: 'Missing required booking fields' };
    }

    const booking = await prisma.transportBooking.create({
      data: {
        userId,
        originZip,
        destZip,
        carrierType,
        estimatedPrice,
        estimatedMiles: estimatedMiles || 0,
        status: 'PENDING'
      }
    });

    return booking;
  }
}

module.exports = new SafetyService();
