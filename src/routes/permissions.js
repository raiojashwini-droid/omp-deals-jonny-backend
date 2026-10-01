const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/authMiddleware');

// Get permissions for a specific role or all roles
router.get('/', requireAuth, async (req, res) => {
  try {
    const allPermissions = await prisma.rolePermission.findMany();
    
    // Transform into a format easy for frontend to consume
    const permissionsMap = {};
    allPermissions.forEach(p => {
      // For each role, parse the JSON
      try {
        const perms = typeof p.permissions === 'string' ? JSON.parse(p.permissions) : p.permissions;
        permissionsMap[p.role.toLowerCase()] = perms;
      } catch (e) {
        permissionsMap[p.role.toLowerCase()] = {};
      }
    });
    
    res.json({ success: true, permissions: permissionsMap });
  } catch (error) {
    console.error('Fetch permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

// Update permissions for a specific role
router.put('/:role', requireAuth, async (req, res) => {
  try {
    const roleId = req.params.role.toUpperCase(); // e.g., 'SALES_REP'
    const newPermissions = req.body;
    
    // Only EXECUTIVE_ADMIN or DEALER_PRO should ideally do this, but we'll allow based on auth for now
    if (req.user.role !== 'EXECUTIVE_ADMIN' && req.user.role !== 'DEALER_PRO') {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify permissions' });
    }

    const updated = await prisma.rolePermission.upsert({
      where: { role: roleId },
      update: { permissions: newPermissions },
      create: { role: roleId, permissions: newPermissions }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
});

// Seed default permissions
router.post('/seed', requireAuth, async (req, res) => {
  try {
    const defaultMatrix = {
      view_inventory: { sales_rep: true, gm: true, finance_mgr: true, guest: true, owner: true, broker: true, amp_affiliate: true, liaison: true },
      view_true_cost: { sales_rep: false, gm: true, finance_mgr: true, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      edit_inventory_price: { sales_rep: false, gm: true, finance_mgr: false, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      access_deal_calculator: { sales_rep: true, gm: true, finance_mgr: true, guest: true, owner: true, broker: true, amp_affiliate: false, liaison: true },
      override_rate_markup: { sales_rep: false, gm: true, finance_mgr: true, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      approve_bhph_loans: { sales_rep: false, gm: true, finance_mgr: true, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      submit_lender_app: { sales_rep: true, gm: true, finance_mgr: true, guest: false, owner: true, broker: true, amp_affiliate: false, liaison: false },
      execute_esign_deals: { sales_rep: false, gm: true, finance_mgr: true, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      export_deal_audit: { sales_rep: false, gm: true, finance_mgr: true, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      view_roi_dashboard: { sales_rep: false, gm: true, finance_mgr: true, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      central_office_admin: { sales_rep: false, gm: false, finance_mgr: false, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: false },
      manage_team_roles: { sales_rep: false, gm: true, finance_mgr: false, guest: false, owner: true, broker: false, amp_affiliate: false, liaison: true }
    };

    // Pivot it so it's keyed by role
    const roles = ['SALES_REP', 'SALES_MGR', 'EXECUTIVE_ADMIN', 'DEALER_PRO', 'GUEST', 'BROKER', 'AMP_AFFILIATE', 'LIAISON'];
    const roleMapping = {
      SALES_REP: 'sales_rep',
      SALES_MGR: 'gm',
      DEALER_PRO: 'gm',
      EXECUTIVE_ADMIN: 'owner',
      GUEST: 'guest',
      BROKER: 'broker',
      AMP_AFFILIATE: 'amp_affiliate',
      LIAISON: 'liaison'
    };

    for (const role of roles) {
      const internalKey = roleMapping[role];
      const rolePerms = {};
      
      for (const [permKey, valObj] of Object.entries(defaultMatrix)) {
        rolePerms[permKey] = valObj[internalKey] || false;
      }

      await prisma.rolePermission.upsert({
        where: { role: role },
        update: { permissions: rolePerms },
        create: { role: role, permissions: rolePerms }
      });
    }

    res.json({ success: true, message: 'Permissions seeded successfully' });
  } catch (error) {
    console.error('Seed permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to seed permissions' });
  }
});

module.exports = router;
