const fs = require('fs');
const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const phaseHMethods = `
  async getRoiDashboard(req, res) {
    try {
      const user = req.user;
      const { storeIds } = req.query;
      
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

      if (targetStoreIds.length === 0) return res.json({ success: true, data: { revenue: 0, expenses: 0, reconditioning: 0, netProfit: 0 } });

      const [deals, expenses, recon] = await Promise.all([
        prisma.deal.findMany({ where: { storeId: { in: targetStoreIds }, status: 'WON' } }),
        prisma.expense.findMany({ where: { storeId: { in: targetStoreIds } } }),
        prisma.reconditioningOrder.findMany({ where: { storeId: { in: targetStoreIds }, status: 'COMPLETED' } })
      ]);

      const revenue = deals.reduce((acc, d) => acc + (d.sale_price || 0), 0);
      const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const totalRecon = recon.reduce((acc, r) => acc + (r.actualCost || r.estimatedCost || 0), 0);
      
      const netProfit = revenue - totalExpenses - totalRecon;

      res.json({
        success: true,
        data: {
          revenue,
          expenses: totalExpenses,
          reconditioning: totalRecon,
          netProfit,
          dealCount: deals.length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getExpenses(req, res) {
    try {
      const user = req.user;
      const { storeIds } = req.query;
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

      if (targetStoreIds.length === 0) return res.json({ success: true, data: [] });

      const expenses = await prisma.expense.findMany({
        where: { storeId: { in: targetStoreIds } },
        orderBy: { date: 'desc' },
        include: { store: { select: { name: true } } }
      });

      res.json({ success: true, data: expenses });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async createExpense(req, res) {
    try {
      const user = req.user;
      const { storeId, category, amount, description } = req.body;
      
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const store = await prisma.store.findFirst({
        where: { id: storeId, organizationId: user.organizationId }
      });

      if (!store) return res.status(403).json({ success: false, error: { message: 'Store access denied' } });

      // Mock receiptUrl logic handling since we don't have real S3 bucket hooked up right now
      let receiptUrl = null;
      if (req.files && req.files.receipt) {
        receiptUrl = 'https://example.com/receipts/' + Date.now();
      }

      const expense = await prisma.expense.create({
        data: {
          storeId,
          category,
          amount: parseFloat(amount),
          description,
          receiptUrl
        }
      });

      res.json({ success: true, data: expense });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getBhphLedgers(req, res) {
    try {
      const user = req.user;
      const { storeIds } = req.query;
      
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

      if (targetStoreIds.length === 0) return res.json({ success: true, data: [] });

      const deals = await prisma.deal.findMany({
        where: { storeId: { in: targetStoreIds }, paymentInstallments: { some: {} } },
        include: {
          paymentInstallments: { orderBy: { dueDate: 'asc' } },
          store: { select: { name: true } },
          customer: true
        }
      });

      res.json({ success: true, data: deals });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getIntegrationSettings(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const settings = await prisma.integrationSetting.findMany({
        where: { organizationId: user.organizationId }
      });

      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async saveIntegrationSettings(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const { provider } = req.body;
      
      // If we attempt to connect without valid backend provider keys, block it
      return res.status(503).json({ success: false, error: { message: \`\${provider} integration API provider is not configured.\` } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getTeamInvitations(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const invites = await prisma.teamInvitation.findMany({
        where: { organizationId: user.organizationId }
      });

      res.json({ success: true, data: invites });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async createTeamInvitation(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) return res.status(403).json({ success: false, error: { message: 'Organization required' } });

      const { email, role } = req.body;
      
      if (!process.env.EMAIL_PROVIDER_KEY) {
        return res.status(503).json({ success: false, error: { message: 'Email provider not configured. Cannot send invitations.' } });
      }

      res.json({ success: true, data: { status: 'SENT' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('getRoiDashboard(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, phaseHMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added Phase H methods to executiveController.js');
} else {
  console.log('Phase H methods already exist');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('/reports/roi')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `
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
`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added Phase H routes to executive.js');
} else {
  console.log('Phase H routes already exist');
}
