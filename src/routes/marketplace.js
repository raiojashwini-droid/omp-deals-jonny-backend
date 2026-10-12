const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

// ─── FAVORITES (AUTHENTICATED) ────────────────────────────────────────────────
router.get('/favorites', requireAuth, marketplaceController.getFavorites);
router.post('/favorites', requireAuth, marketplaceController.addFavorite);
router.post('/favorites/sync', requireAuth, marketplaceController.syncFavorites);
router.delete('/favorites/:vehicleId', requireAuth, marketplaceController.removeFavorite);

// Search & Filter Listings
router.get('/listings', marketplaceController.getListings);

// Global Stats (for sidebar/dashboard dynamic data)
router.get('/stats', marketplaceController.getStats);

// Decode VIN
router.get('/decode/:vin', marketplaceController.decodeVin);

// Get Single Listing (Dynamic param at bottom)
router.get('/listings/:id', marketplaceController.getListingById);

// Create New Listing
router.post('/listings', optionalAuth, marketplaceController.createListing);

// Update Listing
router.put('/listings/:id', requireAuth, marketplaceController.updateListing);

// Delete Listing
router.delete('/listings/:id', requireAuth, marketplaceController.deleteListing);

module.exports = router;
