const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

jest.setTimeout(30000); // For Prisma DB hooks

// Mock auth middleware to easily simulate different roles and store associations
jest.mock('../src/middleware/authMiddleware', () => {
  const mockAuth = (req, res, next) => {
    if (!req.mockUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = req.mockUser;
    next();
  };
  return {
    requireAuth: mockAuth,
    requireRoles: (roles) => (req, res, next) => {
      mockAuth(req, res, () => {
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      });
    },
    optionalAuth: (req, res, next) => next(),
    sseAuthMiddleware: (req, res, next) => next(),
  };
});

describe('P1 Dealership Liaison Workflow', () => {
  let storeA, storeB;
  let liaisonA, liaisonB, unauthorizedUser, salesRepA, salesRepB;
  let leadStoreA_NoConsent, leadStoreA_Consent, leadStoreB;

  beforeAll(async () => {
    // 1. Create two isolated dealerships
    storeA = await prisma.store.upsert({
      where: { id: 'store-a-p1' },
      update: {},
      create: {
        id: 'store-a-p1',
        name: 'Store A',
        city: 'Miami',
        state: 'FL',
        zip: '33101',
        phone: '555-000-0001'
      }
    });

    storeB = await prisma.store.upsert({
      where: { id: 'store-b-p1' },
      update: {},
      create: {
        id: 'store-b-p1',
        name: 'Store B',
        city: 'Tampa',
        state: 'FL',
        zip: '33601',
        phone: '555-000-0002'
      }
    });

    // 2. Create Users (Liaison A, Liaison B, Sales A, Sales B, Unauthorized)
    const cleanupIds = [];

    const createUser = async (email, role, storeId) => {
      const u = await prisma.user.create({
        data: {
          email,
          role,
          store: { connect: { id: storeId } },
          full_name: `Test ${role} ${storeId}`,
          passwordHash: 'password123'
        }
      });
      cleanupIds.push(u.id);
      return u;
    };

    liaisonA = await createUser('liaisona@test.com', 'LIAISON', storeA.id);
    liaisonB = await createUser('liaisonb@test.com', 'LIAISON', storeB.id);
    salesRepA = await createUser('salesa@test.com', 'SALES_REP', storeA.id);
    salesRepB = await createUser('salesb@test.com', 'SALES_REP', storeB.id);
    unauthorizedUser = await createUser('unauth@test.com', 'GUEST', storeA.id);

    // 3. Create Leads
    leadStoreA_NoConsent = await prisma.lead.create({
      data: {
        storeId: storeA.id,
        customerName: 'No Consent A',
        customerPhone: '(555) 111-1111',
        phone_consent: false
      }
    });

    leadStoreA_Consent = await prisma.lead.create({
      data: {
        storeId: storeA.id,
        customerName: 'Consent A',
        customerPhone: '(555) 222-2222',
        phone_consent: true
      }
    });

    leadStoreB = await prisma.lead.create({
      data: {
        storeId: storeB.id,
        customerName: 'Lead B',
        customerPhone: '(555) 333-3333',
        phone_consent: false
      }
    });
  });

  afterAll(async () => {
    // Cleanup leads and users
    if (leadStoreA_NoConsent) await prisma.lead.delete({ where: { id: leadStoreA_NoConsent.id } }).catch(() => {});
    if (leadStoreA_Consent) await prisma.lead.delete({ where: { id: leadStoreA_Consent.id } }).catch(() => {});
    if (leadStoreB) await prisma.lead.delete({ where: { id: leadStoreB.id } }).catch(() => {});
    
    const userEmails = ['liaisona@test.com', 'liaisonb@test.com', 'salesa@test.com', 'salesb@test.com', 'unauth@test.com'];
    await prisma.user.deleteMany({ where: { email: { in: userEmails } } }).catch(() => {});
    
    if (storeA) await prisma.store.delete({ where: { id: storeA.id } }).catch(() => {});
    if (storeB) await prisma.store.delete({ where: { id: storeB.id } }).catch(() => {});
  });

  describe('Authorization & Access', () => {
    it('should allow Liaison A to access Store A leads', async () => {
      app.request.mockUser = liaisonA;
      const res = await request(app).get('/api/v1/crm/leads');
      expect(res.status).toBe(200);
      expect(res.body.leads).toBeDefined();
      expect(res.body.leads.length).toBeGreaterThanOrEqual(2); // The two A leads
      
      const foundA = res.body.leads.find(l => l.id === leadStoreA_NoConsent.id);
      expect(foundA).toBeDefined();
    });

    it('should deny Unauthorized user from accessing leads', async () => {
      app.request.mockUser = unauthorizedUser;
      const res = await request(app).get('/api/v1/crm/leads');
      expect(res.status).toBe(403);
    });
  });

  describe('Cross-store Isolation', () => {
    it('should NOT allow Liaison A to retrieve Store B leads', async () => {
      app.request.mockUser = liaisonA;
      const res = await request(app).get('/api/v1/crm/leads');
      expect(res.status).toBe(200);
      
      const foundB = res.body.leads.find(l => l.id === leadStoreB.id);
      expect(foundB).toBeUndefined(); // Store B lead should be entirely absent
    });
  });

  describe('Lead Assignment Authorization', () => {
    it('should allow Liaison A to assign a Store A lead to Sales Rep A', async () => {
      app.request.mockUser = liaisonA;
      const res = await request(app)
        .patch(`/api/v1/crm/leads/${leadStoreA_NoConsent.id}/assign`)
        .send({ assigneeUserId: salesRepA.id });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('Assigned');
    });

    it('should fail if Liaison A tries to assign Store A lead to Sales Rep B (cross-store assignment)', async () => {
      app.request.mockUser = liaisonA;
      const res = await request(app)
        .patch(`/api/v1/crm/leads/${leadStoreA_Consent.id}/assign`)
        .send({ assigneeUserId: salesRepB.id });
      
      expect(res.status).toBe(403);
    });

    it('should fail if Liaison B tries to assign Store A lead to Sales Rep A (cross-store access)', async () => {
      app.request.mockUser = liaisonB;
      const res = await request(app)
        .patch(`/api/v1/crm/leads/${leadStoreA_Consent.id}/assign`)
        .send({ assigneeUserId: salesRepA.id });
      
      expect(res.status).toBe(403);
    });
  });

  describe('Phone Security (P0 Intact)', () => {
    it('should mask phone number when consent is false for Liaison', async () => {
      app.request.mockUser = liaisonA;
      const res = await request(app).get('/api/v1/crm/leads');
      
      const noConsentLead = res.body.leads.find(l => l.id === leadStoreA_NoConsent.id);
      expect(noConsentLead).toBeDefined();
      expect(noConsentLead.customerPhone).toBeNull();
      expect(noConsentLead.phone).toBeNull();
    });
  });
});
