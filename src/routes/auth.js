const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authenticate with Credentials
router.post('/login', authController.login);

// Instant 1-Click Demo Login
router.post('/quick-demo', authController.quickDemo);

module.exports = router;
