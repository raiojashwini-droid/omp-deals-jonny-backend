const safetyService = require('../services/safetyService');

class SafetyController {
  async getPoliceSafeSpots(req, res) {
    try {
      const filters = req.query;
      const spots = await safetyService.getPoliceSafeSpots(filters);
      
      res.status(200).json({
        success: true,
        total: spots.length,
        data: spots
      });
    } catch (error) {
      console.error('Get Safe Spots Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'FETCH_SAFE_SPOTS_FAILED',
          message: error.message || 'An error occurred while fetching safe spots'
        }
      });
    }
  }

  calculateShippingEstimate(req, res) {
    try {
      const data = req.body;
      const estimate = safetyService.calculateShippingEstimate(data);
      
      res.status(200).json({
        success: true,
        ...estimate
      });
    } catch (error) {
      console.error('Shipping Estimate Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 400 ? 'VALIDATION_ERROR' : 'ESTIMATE_FAILED',
          message: error.message || 'An error occurred while calculating shipping estimate'
        }
      });
    }
  }

  async bookShipping(req, res) {
    try {
      const data = req.body;
      data.userId = req.user.id;
      const booking = await safetyService.bookShipping(data);
      
      res.status(201).json({
        success: true,
        message: 'Transport booking created successfully',
        booking
      });
    } catch (error) {
      console.error('Shipping Booking Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'BOOKING_FAILED',
          message: error.message || 'Failed to book shipping'
        }
      });
    }
  }
}

module.exports = new SafetyController();
