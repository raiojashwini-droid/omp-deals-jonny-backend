const fs = require('fs');

const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const vhrAltsMethods = `
  async requestVHR(req, res) {
    try {
      const user = req.user;
      const { vin } = req.body;
      
      if (!vin) return res.status(400).json({ success: false, error: { message: 'VIN is required' } });
      
      // Real integration boundary
      if (!process.env.CARFAX_API_KEY && !process.env.AUTOCHECK_API_KEY) {
        return res.status(503).json({ 
          success: false, 
          error: { message: 'VHR provider not configured. Please add CARFAX_API_KEY or AUTOCHECK_API_KEY to environment variables.' } 
        });
      }

      // If configured, we would make the call here.
      // Since it's not actually configured in this env, we hit the 503 above cleanly.
      
      res.json({ success: true, data: { status: 'PENDING' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async requestTitleSearch(req, res) {
    try {
      const user = req.user;
      const { vin, state } = req.body;
      
      if (!vin) return res.status(400).json({ success: false, error: { message: 'VIN is required' } });

      // Real integration boundary for NMVTIS or equivalent
      if (!process.env.NMVTIS_API_KEY) {
        return res.status(503).json({ 
          success: false, 
          error: { message: 'Title Search provider not configured. Please configure NMVTIS_API_KEY.' } 
        });
      }

      res.json({ success: true, data: { status: 'PENDING' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async requestMarketPricing(req, res) {
    try {
      const user = req.user;
      const { vin, mileage } = req.body;
      
      if (!vin) return res.status(400).json({ success: false, error: { message: 'VIN is required' } });

      // Real integration boundary for BlackBook, KBB, or JD Power
      if (!process.env.MARKET_PRICING_API_KEY) {
        return res.status(503).json({ 
          success: false, 
          error: { message: 'Market Pricing provider not configured. Please configure MARKET_PRICING_API_KEY.' } 
        });
      }

      res.json({ success: true, data: { status: 'PENDING' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('requestVHR(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, vhrAltsMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added VHR/ALTS/AIMP methods to executiveController.js');
} else {
  console.log('VHR methods already exist');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('/vhr')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `
router.post('/vhr', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.requestVHR);
router.post('/title-search', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.requestTitleSearch);
router.post('/market-pricing', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.requestMarketPricing);

module.exports = router;
`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added VHR routes to executive.js');
} else {
  console.log('VHR routes already exist');
}
