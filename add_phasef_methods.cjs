const fs = require('fs');

const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const phaseFMethods = `
  async getWebsiteSettings(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Organization required' } });
      }

      const settings = await prisma.websiteSetting.findUnique({
        where: { organizationId: user.organizationId }
      });

      res.json({ success: true, data: settings || {} });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async saveWebsiteSettings(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Organization required' } });
      }

      const { siteName, contactEmail, contactPhone, theme, primaryColor, domain, isPublished, seoTitle, seoDescription } = req.body;

      const settings = await prisma.websiteSetting.upsert({
        where: { organizationId: user.organizationId },
        update: {
          siteName, contactEmail, contactPhone, theme, primaryColor, domain, isPublished, seoTitle, seoDescription
        },
        create: {
          organizationId: user.organizationId,
          siteName, contactEmail, contactPhone, theme, primaryColor, domain, isPublished, seoTitle, seoDescription
        }
      });

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async publishListing(req, res) {
    try {
      const user = req.user;
      const { vehicleId } = req.body;
      
      if (!vehicleId) return res.status(400).json({ success: false, error: { message: 'Vehicle ID required' } });

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, store: { organizationId: user.organizationId } }
      });
      
      if (!vehicle) {
        return res.status(404).json({ success: false, error: { message: 'Vehicle not found or unauthorized' } });
      }

      if (!process.env.AIPM_PROVIDER_KEY) {
        return res.status(503).json({ success: false, error: { message: 'Publishing provider not configured' } });
      }

      res.json({ success: true, data: { status: 'PUBLISHED' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
  
  async getVehicleMedia(req, res) {
    try {
      const user = req.user;
      const { vehicleId } = req.params;
      
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, store: { organizationId: user.organizationId } }
      });
      
      if (!vehicle) {
        return res.status(404).json({ success: false, error: { message: 'Vehicle not found or unauthorized' } });
      }

      const media = await prisma.vehicleMedia.findMany({
        where: { vehicleId },
        orderBy: { sortOrder: 'asc' }
      });

      res.json({ success: true, data: media });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async uploadVehicleMedia(req, res) {
    try {
      const user = req.user;
      const { vehicleId, mediaType, isLiveStream } = req.body;
      
      if (!vehicleId) return res.status(400).json({ success: false, error: { message: 'Vehicle ID required' } });

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, store: { organizationId: user.organizationId } }
      });
      
      if (!vehicle) {
        return res.status(404).json({ success: false, error: { message: 'Vehicle not found or unauthorized' } });
      }

      if (!req.files || !req.files.media) {
         return res.status(400).json({ success: false, error: { message: 'Media file is required' } });
      }

      if (isLiveStream === 'true' && !process.env.AVL_STREAMING_KEY) {
         return res.status(503).json({ success: false, error: { message: 'Live streaming provider not configured.' } });
      }

      // Mock save to S3 or similar and get URL
      const mockUrl = 'https://example.com/media/' + vehicleId + '/' + Date.now();
      
      const media = await prisma.vehicleMedia.create({
        data: {
          vehicleId,
          mediaType: mediaType || 'IMAGE',
          url: mockUrl,
          isLiveStream: isLiveStream === 'true'
        }
      });

      res.json({ success: true, data: media });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('getWebsiteSettings(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, phaseFMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added Phase F methods to executiveController.js');
} else {
  console.log('Phase F methods already exist');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('/website')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `
router.get('/website', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getWebsiteSettings);
router.post('/website', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.saveWebsiteSettings);
router.post('/publishing/publish', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.publishListing);
router.get('/vehicles/:vehicleId/media', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getVehicleMedia);
router.post('/vehicles/media', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.uploadVehicleMedia);

module.exports = router;
`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added Phase F routes to executive.js');
} else {
  console.log('Phase F routes already exist');
}
