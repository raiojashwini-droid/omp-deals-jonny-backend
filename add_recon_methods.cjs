const fs = require('fs');
const path = require('path');

const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const reconMethods = `
  async getReconOrders(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Organization required' } });
      }

      // Check if storeIds are provided and validate them
      let targetStoreIds = [];
      const { storeIds } = req.query;
      
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

      if (targetStoreIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const orders = await prisma.reconditioningOrder.findMany({
        where: { storeId: { in: targetStoreIds } },
        include: {
          vehicle: { select: { id: true, title: true, vin: true, mileage: true } },
          store: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('getReconOrders Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async createReconOrder(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Organization required' } });
      }

      const { vehicleId, storeId, description, vendor, estimatedCost } = req.body;

      if (!vehicleId || !storeId || !description) {
        return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
      }

      // Verify store belongs to organization
      const store = await prisma.store.findFirst({
        where: { id: storeId, organizationId: user.organizationId }
      });

      if (!store) {
        return res.status(403).json({ success: false, error: { message: 'Unauthorized store' } });
      }
      
      // Verify vehicle belongs to store
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, storeId }
      });
      
      if (!vehicle) {
         return res.status(403).json({ success: false, error: { message: 'Unauthorized vehicle or vehicle not found in store' } });
      }

      const order = await prisma.reconditioningOrder.create({
        data: {
          vehicleId,
          storeId,
          organizationId: user.organizationId,
          description,
          vendor,
          estimatedCost: parseFloat(estimatedCost) || 0,
          status: 'OPEN'
        }
      });

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('createReconOrder Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async updateReconOrderStatus(req, res) {
    try {
      const user = req.user;
      const { id } = req.params;
      const { status, actualCost } = req.body;

      if (!user.organizationId) {
         return res.status(403).json({ success: false, error: { message: 'Organization required' } });
      }

      // Verify ownership
      const existing = await prisma.reconditioningOrder.findFirst({
        where: { id, organizationId: user.organizationId }
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: { message: 'Order not found' } });
      }

      const order = await prisma.reconditioningOrder.update({
        where: { id },
        data: {
          status,
          actualCost: actualCost !== undefined ? parseFloat(actualCost) : existing.actualCost
        }
      });
      
      // If completed and has actual cost, we might want to auto-create an expense
      // But for now, we just update the ROM.

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('updateReconOrderStatus Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('getReconOrders(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, reconMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added recon methods to executiveController.js');
} else {
  console.log('Recon methods already exist');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('/recon')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `
router.get('/recon', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.getReconOrders);
router.post('/recon', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.createReconOrder);
router.patch('/recon/:id/status', requireAuth, requireRoles(['EXECUTIVE_ADMIN', 'DEALER_PRO']), executiveController.updateReconOrderStatus);

module.exports = router;
`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added ROM routes to executive.js');
} else {
  console.log('ROM routes already exist');
}
