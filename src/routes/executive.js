const express = require('express');
const router = express.Router();
const executiveController = require('../controllers/executiveController');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');

router.get('/stores', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getStores);
router.get('/reports', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getReports);

module.exports = router;
