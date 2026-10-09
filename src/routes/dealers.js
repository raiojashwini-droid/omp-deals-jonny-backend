const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

// Get Auto Money Lot Storefront
router.get('/:dealerId/inventory', dealerController.getDealerInventory);

// Record 10-second tracking event
router.post('/:dealerId/track', optionalAuth, dealerController.recordTrackingEvent);

// DMS Feed Sync data
router.get('/dms-feed', requireAuth, dealerController.getDmsFeedData);

// Force sync now
router.post('/dms-feed/sync', requireAuth, dealerController.forceSyncNow);

// Update Verified Dealer Settings
router.patch('/verified-settings', requireAuth, dealerController.updateVerifiedSettings);

module.exports = router;
