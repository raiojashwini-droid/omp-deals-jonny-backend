const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');

// Search & Filter Listings
router.get('/listings', marketplaceController.getListings);

// Get Single Listing
router.get('/listings/:id', marketplaceController.getListingById);

// Create New Listing
const { requireAuth } = require('../middleware/authMiddleware');
router.post('/listings', requireAuth, marketplaceController.createListing);

// Update Listing
router.put('/listings/:id', requireAuth, marketplaceController.updateListing);

// Delete Listing
router.delete('/listings/:id', requireAuth, marketplaceController.deleteListing);

// Decode VIN
router.get('/decode/:vin', marketplaceController.decodeVin);

// Global Stats (for sidebar/dashboard dynamic data)
router.get('/stats', marketplaceController.getStats);

module.exports = router;
