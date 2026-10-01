const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Submit Purchase Intent & Phone Consent
// Uses optionalAuth: authenticated users get dealership validation,
// unauthenticated marketplace consumers are allowed (End User flow).
router.post('/intent', optionalAuth, leadController.createIntentLead);

module.exports = router;
