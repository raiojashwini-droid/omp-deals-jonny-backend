const fs = require('fs');
const file = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('/verification/status')) {
  content = content.replace('module.exports = router;', `
router.get('/verification/status', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getVerificationStatus);
router.post('/verification/submit', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.submitVerification);
router.post('/verification/review', requireAuth, requireRoles(['LIAISON']), executiveController.reviewVerification);

module.exports = router;
`);
  fs.writeFileSync(file, content);
  console.log('Added verification routes');
} else {
  console.log('Verification routes already exist');
}
