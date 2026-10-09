const fs = require('fs');
const path = require('path');

const controllerPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const createStoreMethod = `
  async createStore(req, res) {
    try {
      const user = req.user;
      if (user.role !== 'EXECUTIVE_ADMIN' || !user.organizationId) {
        return res.status(403).json({ success: false, error: { message: 'Access denied: Executive Organization required' } });
      }

      const { name, city, state, activeUnits } = req.body;
      if (!name || !city) {
        return res.status(400).json({ success: false, error: { message: 'Store name and city are required' } });
      }

      // Check verification status, must be APPROVED to provision new stores.
      // If we don't strictly enforce it here because this might be a demo, we should at least check if organization exists.
      // Wait, user says: "Do not create a store if the organization lacks required authorization"
      const orgVerification = await prisma.organizationVerification.findUnique({
        where: { organizationId: user.organizationId }
      });
      
      // We will allow creation if approved or if there's no verification system fully blocking it yet.
      // To strictly follow rules, let's enforce APPROVED.
      if (!orgVerification || orgVerification.status !== 'APPROVED') {
        return res.status(403).json({ success: false, error: { message: 'Organization must be APPROVED to provision new locations' } });
      }

      // Respect existing subscription/license limits - placeholder comment
      // Since no billing models were observed limiting store count in prisma schema, we allow creation.

      const newStore = await prisma.store.create({
        data: {
          name,
          city,
          state: state || 'Unknown',
          organizationId: user.organizationId,
          activeUnits: parseInt(activeUnits) || 30,
          licenseStatus: 'Active (Provisioned)',
          dms_provider: 'CDK' // default
        }
      });

      res.json({ success: true, data: newStore });
    } catch (error) {
      console.error('createStore Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

if (!content.includes('createStore(req, res)')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, createStoreMethod + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(controllerPath, content);
  console.log('Added createStore to executiveController.js');
} else {
  console.log('createStore already exists');
}

const routesPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/routes/executive.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('router.post(\'/stores\'')) {
  routesContent = routesContent.replace(
    'module.exports = router;',
    `router.post('/stores', requireAuth, requireRoles(['EXECUTIVE_ADMIN']), executiveController.createStore);\n\nmodule.exports = router;`
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added POST /stores to executive.js');
} else {
  console.log('POST /stores route already exists');
}
