const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { requireAuth, sseAuthMiddleware, requireRoles } = require('../middleware/authMiddleware');

// SSE Stream for Real-time Notifications
router.get('/notifications/stream', sseAuthMiddleware, requireRoles(['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_MGR', 'SALES_REP', 'BROKER', 'AMP_AFFILIATE']), crmController.streamNotifications);

// Fetch DB Notifications
router.get('/notifications', requireAuth, requireRoles(['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_MGR', 'SALES_REP', 'BROKER', 'AMP_AFFILIATE']), crmController.getNotifications);

// Mark DB Notification Read
router.patch('/notifications/:id/read', requireAuth, requireRoles(['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_MGR', 'SALES_REP', 'BROKER', 'AMP_AFFILIATE']), crmController.markNotificationRead);

// Fetch Incoming Lead Triage Queue
// Allowed roles: LIAISON, DEALER_PRO, EXECUTIVE_ADMIN, SALES_MGR, SALES_REP, BROKER, AMP_AFFILIATE
router.get('/leads', requireAuth, requireRoles(['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_MGR', 'SALES_REP', 'BROKER', 'AMP_AFFILIATE']), crmController.getLeads);

// Assign Lead to Sales Staff
// Allowed roles: LIAISON, DEALER_PRO, EXECUTIVE_ADMIN, SALES_MGR
router.patch('/leads/:id/assign', requireAuth, requireRoles(['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_MGR']), crmController.assignLead);

// Log Call Activity
// Allowed roles: SALES_REP, SALES_MGR, DEALER_PRO, EXECUTIVE_ADMIN, BROKER, AMP_AFFILIATE
router.post('/calls/log', requireAuth, requireRoles(['SALES_REP', 'SALES_MGR', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'BROKER', 'AMP_AFFILIATE']), crmController.logCall);

// Append Timestamped Sales Note
// Allowed roles: SALES_REP, SALES_MGR, DEALER_PRO, EXECUTIVE_ADMIN, LIAISON, BROKER, AMP_AFFILIATE
router.post('/leads/:id/notes', requireAuth, requireRoles(['SALES_REP', 'SALES_MGR', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'LIAISON', 'BROKER', 'AMP_AFFILIATE']), crmController.addNote);

// Get Lead Messages
router.get('/leads/:id/messages', requireAuth, crmController.getLeadMessages);

// Send Message to Lead
router.post('/leads/:id/messages', requireAuth, crmController.sendLeadMessage);

// Update Lead Status
// Allowed roles: SALES_REP, SALES_MGR, DEALER_PRO, EXECUTIVE_ADMIN, LIAISON, BROKER, AMP_AFFILIATE
router.patch('/leads/:id/status', requireAuth, requireRoles(['SALES_REP', 'SALES_MGR', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'LIAISON', 'BROKER', 'AMP_AFFILIATE']), crmController.updateLeadStatus);

// Fetch Dealership Staff Roster
// Allowed roles: LIAISON, DEALER_PRO, EXECUTIVE_ADMIN, SALES_MGR
router.get('/staff', requireAuth, requireRoles(['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'SALES_MGR']), crmController.getStaff);

// Simulate Customer Reply
router.post('/leads/:id/simulate-reply', requireAuth, crmController.simulateCustomerMessage);

module.exports = router;
