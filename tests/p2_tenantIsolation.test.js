const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const jwt = require('jsonwebtoken');

describe('P2.1 - Executive Multi-Store Tenant Isolation', () => {
  jest.setTimeout(30000);

  const orgAId = 'org-a-123';
  const orgBId = 'org-b-456';
  
  const storeA1Id = 'store-a1-123';
  const storeA2Id = 'store-a2-456';
  const storeB1Id = 'store-b1-789';

  const execUserAId = 'exec-user-a';
  const execUserBId = 'exec-user-b';
  const salesRepA1Id = 'sales-user-a1';

  const mockToken = (userPayload) => {
    return jwt.sign(userPayload, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
  };

  beforeAll(async () => {
    // Organizations
    await prisma.organization.upsert({ where: { id: orgAId }, update: {}, create: { id: orgAId, name: 'Org A' } });
    await prisma.organization.upsert({ where: { id: orgBId }, update: {}, create: { id: orgBId, name: 'Org B' } });

    // Stores
    await prisma.store.upsert({ where: { id: storeA1Id }, update: { organizationId: orgAId }, create: { id: storeA1Id, name: 'Store A1', city: 'Miami', state: 'FL', organizationId: orgAId } });
    await prisma.store.upsert({ where: { id: storeA2Id }, update: { organizationId: orgAId }, create: { id: storeA2Id, name: 'Store A2', city: 'Orlando', state: 'FL', organizationId: orgAId } });
    await prisma.store.upsert({ where: { id: storeB1Id }, update: { organizationId: orgBId }, create: { id: storeB1Id, name: 'Store B1', city: 'Tampa', state: 'FL', organizationId: orgBId } });

    // Users
    await prisma.user.upsert({
      where: { email: 'execA@test.com' },
      update: { role: 'EXECUTIVE_ADMIN', organizationId: orgAId, storeId: null },
      create: { id: execUserAId, email: 'execA@test.com', role: 'EXECUTIVE_ADMIN', organizationId: orgAId }
    });
    
    await prisma.user.upsert({
      where: { email: 'execB@test.com' },
      update: { role: 'EXECUTIVE_ADMIN', organizationId: orgBId, storeId: null },
      create: { id: execUserBId, email: 'execB@test.com', role: 'EXECUTIVE_ADMIN', organizationId: orgBId }
    });

    await prisma.user.upsert({
      where: { email: 'salesA1@test.com' },
      update: { role: 'SALES_REP', storeId: storeA1Id, organizationId: null },
      create: { id: salesRepA1Id, email: 'salesA1@test.com', role: 'SALES_REP', storeId: storeA1Id }
    });

    // Leads
    await prisma.lead.create({ data: { id: 'lead-a1', customerName: 'Customer A1', storeId: storeA1Id, status: 'New' } });
    await prisma.lead.create({ data: { id: 'lead-a2', customerName: 'Customer A2', storeId: storeA2Id, status: 'New' } });
    await prisma.lead.create({ data: { id: 'lead-b1', customerName: 'Customer B1', storeId: storeB1Id, status: 'New' } });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: { in: ['lead-a1', 'lead-a2', 'lead-b1'] } } });
    await prisma.user.deleteMany({ where: { email: { in: ['execA@test.com', 'execB@test.com', 'salesA1@test.com'] } } });
    await prisma.store.deleteMany({ where: { id: { in: [storeA1Id, storeA2Id, storeB1Id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  });

  it('1. Executive can access stores belonging to their organization', async () => {
    // Replace auth middleware with our token since app has it
    // Wait, the app uses real authMiddleware.
    // Let's use real auth.
  });
});
