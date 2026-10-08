const prisma = require('../config/prisma');

class ExecutiveController {
  async getStores(req, res) {
    try {
      const user = req.user;
      if (user.role !== 'EXECUTIVE_ADMIN' || !user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied: Executive Organization required' } });
      }

      const stores = await prisma.store.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          licenseStatus: true,
          licenseExpiresAt: true,
        }
      });

      res.json({ success: true, data: stores });
    } catch (error) {
      console.error('getStores Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async getReports(req, res) {
    try {
      const user = req.user;
      if (user.role !== 'EXECUTIVE_ADMIN' || !user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied: Executive Organization required' } });
      }

      let { storeIds } = req.query; // expected to be comma-separated

      let requestedStoreIds = [];
      if (storeIds) {
        if (typeof storeIds === 'string') {
          requestedStoreIds = storeIds.split(',').map(id => id.trim()).filter(id => id);
        } else if (Array.isArray(storeIds)) {
          requestedStoreIds = storeIds;
        }
      }

      // Security Check: Validate ownership of requested stores
      let targetStoreIds = [];
      if (requestedStoreIds.length > 0) {
        const authorizedStores = await prisma.store.findMany({
          where: {
            id: { in: requestedStoreIds },
            organizationId: user.organizationId
          },
          select: { id: true }
        });

        if (authorizedStores.length !== requestedStoreIds.length) {
          return res.status(403).json({ success: false, error: { message: 'Access denied: One or more requested stores do not belong to your organization' } });
        }
        targetStoreIds = authorizedStores.map(s => s.id);
      } else {
        // If "All Locations" / no specific filter, use all stores from org
        const orgStores = await prisma.store.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true }
        });
        targetStoreIds = orgStores.map(s => s.id);
      }

      if (targetStoreIds.length === 0) {
        return res.json({
          success: true,
          data: {
            totalInventory: 0,
            totalLeads: 0,
            totalDeals: 0,
            grossProfit: 0,
            branches: []
          }
        });
      }

      // 1. Inventory count
      const totalInventory = await prisma.vehicle.count({
        where: { storeId: { in: targetStoreIds }, lot_status: 'AVAILABLE' }
      });

      // 2. Leads count
      const totalLeads = await prisma.lead.count({
        where: { storeId: { in: targetStoreIds } }
      });

      // 3. Deals MTD (using 'CLOSED', 'FINANCED')
      const deals = await prisma.deal.findMany({
        where: { storeId: { in: targetStoreIds }, status: { in: ['CLOSED', 'FINANCED'] } },
        select: { id: true, sale_price: true }
      });
      const totalDeals = deals.length;
      
      const grossProfit = deals.reduce((sum, d) => sum + (d.sale_price || 0), 0);

      // Branch breakdown
      const branchesData = await Promise.all(targetStoreIds.map(async (storeId) => {
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        const activeUnits = await prisma.vehicle.count({ where: { storeId, lot_status: 'AVAILABLE' } });
        const soldMtd = await prisma.deal.count({ where: { storeId, status: { in: ['CLOSED', 'FINANCED'] } } });
        const storeDeals = await prisma.deal.findMany({ where: { storeId, status: { in: ['CLOSED', 'FINANCED'] } }, select: { sale_price: true } });
        const gp = storeDeals.reduce((sum, d) => sum + (d.sale_price || 0), 0);

        return {
          id: store.id,
          name: store.name,
          city: store.city || 'Unknown',
          state: store.state || 'Unknown',
          licenseStatus: store.licenseStatus || 'Active',
          activeUnits,
          soldMtd,
          grossProfit: gp,
          status: store.licenseStatus === 'Warning' ? 'Warning' : 'Healthy',
          turnoverDays: 'N/A', 
          auditScore: 'N/A',
          compliance: 'N/A',
          manager: 'Store Manager', // We could fetch from User role SALES_MGR
        };
      }));

      res.json({
        success: true,
        data: {
          totalInventory,
          totalLeads,
          totalDeals,
          grossProfit,
          branches: branchesData
        }
      });

    } catch (error) {
      console.error('getReports Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

module.exports = new ExecutiveController();
