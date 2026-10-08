const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

jest.mock('../src/middleware/authMiddleware', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'EXECUTIVE_ADMIN', storeId: 'auto-money-fl', organizationId: 'test-org' };
    next();
  },
  requireRoles: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  sseAuthMiddleware: (req, res, next) => next(),
}));

// NOTE: This test file simulates the API endpoints related to the P0 lead qualification workflow.
// In a full implementation, you'd use a test DB and setup/teardown hooks.

describe('P0 Lead Qualification Workflow', () => {
  jest.setTimeout(30000); // Allow Prisma DB operations enough time on slower environments

  const testStoreId = 'auto-money-fl';

  beforeAll(async () => {
    // Setup test org if not exists
    await prisma.organization.upsert({
      where: { id: 'test-org' },
      update: {},
      create: { id: 'test-org', name: 'Test Org' }
    });
    // Setup test store if not exists
    await prisma.store.upsert({
      where: { id: testStoreId },
      update: { organizationId: 'test-org' },
      create: {
        id: testStoreId,
        organizationId: 'test-org',
        name: 'Auto Money (Test Pilot)',
        city: 'Miami',
        state: 'FL',
        activeUnits: 42
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lead.deleteMany({
      where: { customerEmail: 'testbuyer@example.com' }
    });
    await prisma.trackingEvent.deleteMany({
      where: { storeId: testStoreId, duration_seconds: 10 }
    });
  });

  describe('10-Second Active Dwell Tracker API', () => {
    it('should successfully record a 10s tracking event', async () => {
      const res = await request(app)
        .post(`/api/v1/dealers/${testStoreId}/track`)
        .send({ durationSeconds: 10, vehicleId: null });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.event.duration_seconds).toBe(10);
    });
  });

  describe('Lead Qualification & Intent API', () => {
    it('should create a new lead with proper qualification mapping and phone consent', async () => {
      const res = await request(app)
        .post('/api/v1/leads/intent')
        .send({
          dealerId: testStoreId,
          customerName: 'Test Buyer',
          phone: '(954) 555-9999',
          buyingTimeline: 'Within 2-5 days',
          qualification: 'BUYER_SHOPPING_AROUND',
          phoneConsent: true,
          sourceRef: 'Test Intent Modal',
          dwellDurationSeconds: 10
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.leadId).toBeDefined();
      expect(res.body.status).toBe('New');
    });

    it('should fail if phone is provided but consent is false', async () => {
      const res = await request(app)
        .post('/api/v1/leads/intent')
        .send({
          dealerId: testStoreId,
          customerName: 'Test No Consent',
          phone: '(954) 555-8888',
          buyingTimeline: 'Just Browsing',
          qualification: 'SHOPPING_AROUND',
          phoneConsent: false,
          dwellDurationSeconds: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/consent is required/i);
    });
  });

  describe('Server-Side Phone Consent Security', () => {
    let leadWithConsentId;
    let leadNoConsentId;

    beforeAll(async () => {
      const lead1 = await prisma.lead.create({
        data: {
          storeId: testStoreId,
          customerName: 'Consent User',
          customerPhone: '(954) 555-1111',
          phone_consent: true,
          buying_timeline: 'NOW',
          qualification: 'BUY_NOW',
          status: 'New',
          source: 'Test'
        }
      });
      leadWithConsentId = lead1.id;

      const lead2 = await prisma.lead.create({
        data: {
          storeId: testStoreId,
          customerName: 'No Consent User',
          customerPhone: '(954) 555-2222',
          phone_consent: false,
          buying_timeline: 'Just Browsing',
          qualification: 'SHOPPING_AROUND',
          status: 'New',
          source: 'Test'
        }
      });
      leadNoConsentId = lead2.id;
    });

    afterAll(async () => {
      const idsToDelete = [leadWithConsentId, leadNoConsentId].filter(Boolean);
      if (idsToDelete.length > 0) {
        await prisma.lead.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }
    });

    it('GET /crm/leads should mask phone number when consent is false', async () => {
      const res = await request(app).get(`/api/v1/crm/leads`);
      
      expect(res.status).toBe(200);
      expect(res.body.leads).toBeDefined();

      const maskedLead = res.body.leads.find(l => l.id === leadNoConsentId);
      
      expect(maskedLead).toBeDefined();

      expect(maskedLead.customerPhone).toBeNull();
      // Ensure the 'phone' property is also checked as per requirements
      expect(maskedLead.phone).toBeNull();
    });
  });
});
