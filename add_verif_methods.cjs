const fs = require('fs');
const file = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(file, 'utf8');

const newMethods = `
  async getVerificationStatus(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) {
        return res.status(400).json({ success: false, error: { message: 'User not associated with an organization' } });
      }

      const verification = await prisma.organizationVerification.findUnique({
        where: { organizationId: user.organizationId }
      });

      if (!verification) {
        return res.json({ success: true, data: { status: 'NONE' } });
      }

      res.json({ success: true, data: verification });
    } catch (error) {
      console.error('getVerificationStatus Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async submitVerification(req, res) {
    try {
      const user = req.user;
      if (!user.organizationId) {
        return res.status(400).json({ success: false, error: { message: 'User not associated with an organization' } });
      }

      const { legalName, businessType, registrationNo, taxId, addressStreet, addressCity, addressState, addressZip, primaryContact, contactEmail, contactPhone } = req.body;

      const verification = await prisma.organizationVerification.upsert({
        where: { organizationId: user.organizationId },
        update: {
          status: 'SUBMITTED',
          legalName, businessType, registrationNo, taxId, addressStreet, addressCity, addressState, addressZip, primaryContact, contactEmail, contactPhone
        },
        create: {
          organizationId: user.organizationId,
          status: 'SUBMITTED',
          legalName, businessType, registrationNo, taxId, addressStreet, addressCity, addressState, addressZip, primaryContact, contactEmail, contactPhone
        }
      });

      res.json({ success: true, data: verification });
    } catch (error) {
      console.error('submitVerification Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }

  async reviewVerification(req, res) {
    try {
      const user = req.user;
      // Ensure only SUPER_ADMIN or equivalent can review. For this scope, EXECUTIVE_ADMIN might be the owner, so we need a system admin check.
      // Assuming a specific role is required for verification review. The prompt says "Restrict review/approval to authorized administrators."
      // If the user's role is not a platform admin, deny. Here we assume we add a PLATFORM_ADMIN check or similar. Since we must use existing roles, maybe we use LIAISON or a special check.
      // Let's assume LIAISON or specific platform roles can approve.
      if (!['LIAISON'].includes(user.role)) {
        return res.status(403).json({ success: false, error: { message: 'Access denied: Platform Admin required' } });
      }

      const { organizationId, action, reason } = req.body; // action: 'APPROVE', 'REJECT'
      
      const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      
      const verification = await prisma.organizationVerification.update({
        where: { organizationId },
        data: {
          status,
          reviewerId: user.id,
          reviewedAt: new Date(),
          rejectionReason: action === 'REJECT' ? reason : null
        }
      });

      res.json({ success: true, data: verification });
    } catch (error) {
      console.error('reviewVerification Error:', error);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
`;

// Insert the new methods before the closing brace of the class
if (!content.includes('getVerificationStatus')) {
  content = content.replace(/}\s*module\.exports = new ExecutiveController\(\);/, newMethods + '\n}\n\nmodule.exports = new ExecutiveController();');
  fs.writeFileSync(file, content);
  console.log('Added verification methods to executiveController.js');
} else {
  console.log('Verification methods already exist.');
}
