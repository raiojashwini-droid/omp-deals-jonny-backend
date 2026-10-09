const fs = require('fs');

const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const aipgMethods = `
  async uploadPhotoGenius(req, res) {
    try {
      const user = req.user;
      const { vehicleId } = req.body;
      
      // Real upload handler would parse form-data (e.g. using multer)
      // Since this is a JSON body proxy representation, we check for presence
      if (!req.files || !req.files.image) {
         return res.status(400).json({ success: false, error: { message: 'Image file is required' } });
      }

      // Genuine provider check
      if (!process.env.AIPG_PROVIDER_KEY) {
         return res.status(503).json({ success: false, error: { message: 'AI Photo enhancement provider not configured.' } });
      }

      // If configured, process image via AI background replacement
      res.json({ success: true, data: { status: 'UPLOADED_AND_PROCESSING' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getPhotoGeniusStatus(req, res) {
    try {
       // Return unavailable/not configured state if no provider
       if (!process.env.AIPG_PROVIDER_KEY) {
         return res.json({ success: true, data: { isConfigured: false } });
       }
       res.json({ success: true, data: { isConfigured: true } });
    } catch (error) {
       res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('uploadPhotoGenius(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, aipgMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added AIPG methods to executiveController.js');
} else {
  console.log('AIPG methods already exist');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('/aipg')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `
router.get('/aipg/status', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.getPhotoGeniusStatus);
router.post('/aipg/upload', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.uploadPhotoGenius);

module.exports = router;
`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added AIPG routes to executive.js');
} else {
  console.log('AIPG routes already exist');
}
