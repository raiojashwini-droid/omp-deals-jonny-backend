const express = require('express');
const router = express.Router();
const deskingController = require('../controllers/deskingController');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');

// Calculate Retail Installment Contract
// Allowed roles: SALES_MGR, DEALER_PRO, EXECUTIVE_ADMIN, SALES_REP, LIAISON, BROKER
router.post('/calculate', requireAuth, requireRoles(['SALES_MGR', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_REP', 'LIAISON', 'BROKER']), deskingController.calculateDeal);

// Get Deal details for E-Sign
router.get('/deals/:id', requireAuth, deskingController.getDeal);

// Sign Deal
router.post('/deals/:id/sign', requireAuth, deskingController.signDeal);

module.exports = router;
