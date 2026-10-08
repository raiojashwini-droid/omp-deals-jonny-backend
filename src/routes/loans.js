const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');

// Public routes for the frontend OAL Network UI
router.get('/categories', loanController.getCategories);
router.post('/apply', loanController.submitApplication);

// Protected CRM routes for Loan Officers & Admins
router.get('/applications', requireAuth, requireRoles('LOAN_OFFICER', 'EXECUTIVE_ADMIN'), loanController.getApplications);
router.patch('/applications/:id/status', requireAuth, requireRoles('LOAN_OFFICER', 'EXECUTIVE_ADMIN'), loanController.updateApplicationStatus);

module.exports = router;
