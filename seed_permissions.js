const prisma = require('./src/config/prisma');

async function seed() {
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
      console.log(`Seeded permissions for ${role}`);
    }
}

seed().catch(console.error).finally(() => process.exit(0));
