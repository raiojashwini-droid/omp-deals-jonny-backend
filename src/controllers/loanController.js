const prisma = require('../config/prisma');

class LoanController {
  async getCategories(req, res) {
    try {
      const categories = await prisma.loanCategory.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Failed to fetch loan categories:', error);
      res.status(500).json({ success: false, error: { message: 'Failed to fetch categories' } });
    }
  }

  async submitApplication(req, res) {
    try {
      const { categoryId, loanType, applicantName, email, phone, businessName, requestedAmount, kycConsent } = req.body;

      if (!kycConsent) {
        return res.status(400).json({ success: false, error: { message: 'Federal KYC consent is required to process the application.' } });
      }

      // 1. Find or Create User with MEMBER role
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            full_name: applicantName,
            phone,
            role: 'MEMBER',
            roleName: 'Network Member',
            is_active: true
          }
        });
      } else {
        // Optionally update the role if they were a GUEST
        if (user.role === 'GUEST') {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'MEMBER', roleName: 'Network Member' }
          });
        }
      }

      // 2. Create the Loan Application
      const application = await prisma.loanApplication.create({
        data: {
          categoryId: categoryId || null,
          loanType: loanType || null,
          userId: user.id,
          applicantName,
          email,
          phone,
          businessName,
          requestedAmount: parseFloat(requestedAmount),
          kycConsent
        }
      });

      res.status(201).json({ success: true, data: application, message: 'Application submitted successfully. A loan officer will contact you within 24 hours.' });
    } catch (error) {
      console.error('Failed to submit application:', error);
      res.status(500).json({ success: false, error: { message: 'Failed to submit loan application' } });
    }
  }

  async getApplications(req, res) {
    try {
      // Typically protected by LOAN_OFFICER or EXECUTIVE_ADMIN role middleware
      const applications = await prisma.loanApplication.findMany({
        include: {
          category: { select: { name: true, iconName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: applications });
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      res.status(500).json({ success: false, error: { message: 'Failed to fetch applications' } });
    }
  }

  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const application = await prisma.loanApplication.update({
        where: { id },
        data: { status }
      });

      res.json({ success: true, data: application, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Failed to update status:', error);
      res.status(500).json({ success: false, error: { message: 'Failed to update application status' } });
    }
  }
}

module.exports = new LoanController();
