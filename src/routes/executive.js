const express = require('express');
const router = express.Router();
const executiveController = require('../controllers/executiveController');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');

router.get('/stores', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getStores);
router.get('/reports', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getReports);


router.get('/verification/status', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getVerificationStatus);
router.post('/verification/submit', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.submitVerification);
router.post('/verification/review', requireAuth, requireRoles(['LIAISON']), executiveController.reviewVerification);

router.post('/stores', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.createStore);


router.post('/vhr', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.requestVHR);
router.post('/title-search', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.requestTitleSearch);
router.post('/market-pricing', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.requestMarketPricing);


router.get('/aipg/status', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.getPhotoGeniusStatus);
router.post('/aipg/upload', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.uploadPhotoGenius);


router.get('/website', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getWebsiteSettings);
router.post('/website', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.saveWebsiteSettings);
router.post('/publishing/publish', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.publishListing);
router.get('/vehicles/:vehicleId/media', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getVehicleMedia);
router.post('/vehicles/media', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.uploadVehicleMedia);


// Phase G CRM & Deal tools
router.get('/crm/leads', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getCrmLeads);
router.get('/crm/deals', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getCrmDeals);
router.get('/phone', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getPhoneSettings);
router.post('/phone', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.savePhoneSettings);
router.post('/desking/calculate', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR', 'SALES_REP']), executiveController.calculateDeal);
router.post('/loans/submit', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR', 'LOAN_OFFICER']), executiveController.submitLoan);
router.post('/documents/esign', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.requestESignature);


// Phase H Methods
router.get('/reports/roi', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getRoiDashboard);
router.get('/expenses', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.getExpenses);
router.post('/expenses', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.createExpense);
router.get('/bhph/ledgers', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getBhphLedgers);
router.get('/integrations', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getIntegrationSettings);
router.post('/integrations', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.saveIntegrationSettings);
router.get('/team/invitations', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getTeamInvitations);
router.post('/team/invitations', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.createTeamInvitation);

module.exports = router;






