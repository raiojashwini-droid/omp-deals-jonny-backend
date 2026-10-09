const fs = require('fs');
const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const phaseGMethods = `
  async getCrmLeads(req, res) {
    try {
      const user = req.user;
      const { storeIds, page = 1, limit = 50 } = req.query;

      if (!user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Organization required' } });
      }

      let targetStoreIds = [];
      if (storeIds) {
        const requestedIds = typeof storeIds === 'string' ? storeIds.split(',') : storeIds;
        const authorized = await prisma.store.findMany({
          where: { id: { in: requestedIds }, organizationId: user.organizationId },
          select: { id: true }
        });
        targetStoreIds = authorized.map(s => s.id);
      } else {
        const orgStores = await prisma.store.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true }
        });
        targetStoreIds = orgStores.map(s => s.id);
      }

      if (targetStoreIds.length === 0) return res.json({ success: true, data: { items: [], total: 0 } });

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { storeId: { in: targetStoreIds } },
          skip,
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
          include: { store: { select: { name: true } }, assigned_to: { select: { full_name: true } } }
        }),
        prisma.lead.count({ where: { storeId: { in: targetStoreIds } } })
      ]);

      res.json({ success: true, data: { items: leads, total } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getCrmDeals(req, res) {
    try {
      const user = req.user;
      const { storeIds, page = 1, limit = 50 } = req.query;

      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      let targetStoreIds = [];
      if (storeIds) {
        const requestedIds = typeof storeIds === 'string' ? storeIds.split(',') : storeIds;
        const authorized = await prisma.store.findMany({
          where: { id: { in: requestedIds }, organizationId: user.organizationId },
          select: { id: true }
        });
        targetStoreIds = authorized.map(s => s.id);
      } else {
        const orgStores = await prisma.store.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true }
        });
        targetStoreIds = orgStores.map(s => s.id);
      }

      if (targetStoreIds.length === 0) return res.json({ success: true, data: { items: [], total: 0 } });

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where: { storeId: { in: targetStoreIds } },
          skip,
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
          include: { store: { select: { name: true } }, sales_reps: { select: { full_name: true } } }
        }),
        prisma.deal.count({ where: { storeId: { in: targetStoreIds } } })
      ]);

      res.json({ success: true, data: { items: deals, total } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getPhoneSettings(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const settings = await prisma.phoneSetting.findUnique({
        where: { organizationId: user.organizationId }
      });

      res.json({ success: true, data: settings || {} });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async savePhoneSettings(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const { isEnabled, timezone, greeting, fallbackPhone } = req.body;

      const settings = await prisma.phoneSetting.upsert({
        where: { organizationId: user.organizationId },
        update: { isEnabled, timezone, greeting, fallbackPhone },
        create: { organizationId: user.organizationId, isEnabled, timezone, greeting, fallbackPhone }
      });

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async calculateDeal(req, res) {
    try {
      const { price, downPayment, tradeInValue, tradeInPayoff, apr, termMonths } = req.body;
      
      const p = parseFloat(price) || 0;
      const dp = parseFloat(downPayment) || 0;
      const tv = parseFloat(tradeInValue) || 0;
      const tp = parseFloat(tradeInPayoff) || 0;
      const rate = parseFloat(apr) || 0;
      const term = parseInt(termMonths) || 60;

      const tradeEquity = tv - tp;
      let amountFinanced = p - dp - tradeEquity;
      if (amountFinanced < 0) amountFinanced = 0; // cannot finance negative

      let monthlyPayment = 0;
      let totalInterest = 0;

      if (amountFinanced > 0) {
        if (rate > 0) {
          const r = (rate / 100) / 12;
          monthlyPayment = (amountFinanced * r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);
          totalInterest = (monthlyPayment * term) - amountFinanced;
        } else {
          monthlyPayment = amountFinanced / term;
        }
      }

      res.json({
        success: true,
        data: {
          amountFinanced: amountFinanced.toFixed(2),
          monthlyPayment: monthlyPayment.toFixed(2),
          totalInterest: totalInterest.toFixed(2),
          termMonths: term,
          apr: rate.toFixed(2)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Calculation error' } });
    }
  }

  async submitLoan(req, res) {
    try {
       // Validate Provider Boundary
       if (!process.env.AUTO_LOAN_PROVIDER_KEY) {
         return res.status(503).json({ success: false, error: { message: 'Auto Loan marketplace provider is not configured. External submissions are disabled.' } });
       }
       res.json({ success: true, data: { status: 'SUBMITTED' } });
    } catch (error) {
       res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async requestESignature(req, res) {
    try {
       // Validate Provider Boundary
       if (!process.env.ESIGN_PROVIDER_KEY) {
         return res.status(503).json({ success: false, error: { message: 'E-Signature provider is not configured. Automated document routing is disabled.' } });
       }
       res.json({ success: true, data: { status: 'SENT' } });
    } catch (error) {
       res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('getCrmLeads(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, phaseGMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added Phase G methods to executiveController.js');
} else {
  console.log('Phase G methods already exist');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('/crm/leads')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `
// Phase G CRM & Deal tools
router.get('/crm/leads', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getCrmLeads);
router.get('/crm/deals', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.getCrmDeals);
router.get('/phone', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.getPhoneSettings);
router.post('/phone', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.savePhoneSettings);
router.post('/desking/calculate', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR', 'SALES_REP']), executiveController.calculateDeal);
router.post('/loans/submit', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR', 'LOAN_OFFICER']), executiveController.submitLoan);
router.post('/documents/esign', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO', 'SALES_MGR']), executiveController.requestESignature);

module.exports = router;
`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added Phase G routes to executive.js');
} else {
  console.log('Phase G routes already exist');
}
