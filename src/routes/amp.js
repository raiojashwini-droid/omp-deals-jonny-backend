const express = require('express');
const router = express.Router();
const ampController = require('../controllers/ampController');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');

// Track public affiliate click
// Allowed roles: Any (Public)
router.post('/clicks', ampController.trackClick);

// Get Affiliate Dashboard Stats
// Allowed roles: AMP_AFFILIATE, EXECUTIVE_ADMIN
router.get('/stats', requireAuth, requireRoles(['AMP_AFFILIATE', 'EXECUTIVE_ADMIN']), ampController.getDashboardStats);

module.exports = router;
