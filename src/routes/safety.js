const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { requireAuth } = require('../middleware/authMiddleware');

// Get Verified Police Safe Spots
// Allowed roles: Any (Public)
router.get('/police-safe-spots', safetyController.getPoliceSafeSpots);

// Calculate Shipping Estimate
// Allowed roles: Any (Public)
router.post('/shipping/estimate', safetyController.calculateShippingEstimate);

// Book Shipping
router.post('/shipping/book', requireAuth, safetyController.bookShipping);

module.exports = router;
