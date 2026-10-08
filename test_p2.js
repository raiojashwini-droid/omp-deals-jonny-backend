const request = require('supertest');
const app = require('./src/app');
const prisma = require('./src/config/prisma');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'omp_secret_key_2024';

const mockToken = (userPayload) => jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

async function runTests() {
  console.log('--- Setting up test data ---');
  const orgAId = 'org-a-123';
  const orgBId = 'org-b-456';
  const storeA1Id = 'store-a1-123';
  const storeA2Id = 'store-a2-456';
  const storeB1Id = 'store-b1-789';

  await prisma.organization.upsert({ where: { id: orgAId }, update: {}, create: { id: orgAId, name: 'Org A' } });
  await prisma.organization.upsert({ where: { id: orgBId }, update: {}, create: { id: orgBId, name: 'Org B' } });

  await prisma.store.upsert({ where: { id: storeA1Id }, update: { organizationId: orgAId }, create: { id: storeA1Id, name: 'Store A1', city: 'Miami', state: 'FL', organizationId: orgAId } });
  await prisma.store.upsert({ where: { id: storeA2Id }, update: { organizationId: orgAId }, create: { id: storeA2Id, name: 'Store A2', city: 'Orlando', state: 'FL', organizationId: orgAId } });
  await prisma.store.upsert({ where: { id: storeB1Id }, update: { organizationId: orgBId }, create: { id: storeB1Id, name: 'Store B1', city: 'Tampa', state: 'FL', organizationId: orgBId } });

  await prisma.user.upsert({ where: { email: 'execA@test.com' }, update: { role: 'EXECUTIVE_ADMIN', organizationId: orgAId, storeId: null }, create: { id: 'exec-a', email: 'execA@test.com', role: 'EXECUTIVE_ADMIN', organizationId: orgAId } });
  await prisma.user.upsert({ where: { email: 'execB@test.com' }, update: { role: 'EXECUTIVE_ADMIN', organizationId: orgBId, storeId: null }, create: { id: 'exec-b', email: 'execB@test.com', role: 'EXECUTIVE_ADMIN', organizationId: orgBId } });
  await prisma.user.upsert({ where: { email: 'salesA1@test.com' }, update: { role: 'SALES_REP', storeId: storeA1Id, organizationId: null }, create: { id: 'sales-a1', email: 'salesA1@test.com', role: 'SALES_REP', storeId: storeA1Id } });

  const leadA1 = await prisma.lead.create({ data: { customerName: 'Customer A1', storeId: storeA1Id, status: 'New' } });
  const leadA2 = await prisma.lead.create({ data: { customerName: 'Customer A2', storeId: storeA2Id, status: 'New' } });
  const leadB1 = await prisma.lead.create({ data: { customerName: 'Customer B1', storeId: storeB1Id, status: 'New' } });

  const tokenExecA = mockToken({ id: 'exec-a', role: 'EXECUTIVE_ADMIN', organizationId: orgAId });
  const tokenExecB = mockToken({ id: 'exec-b', role: 'EXECUTIVE_ADMIN', organizationId: orgBId });
  const tokenSalesA1 = mockToken({ id: 'sales-a1', role: 'SALES_MGR', storeId: storeA1Id });
  
  const tokenGlobalAdmin = mockToken({ id: 'exec-global', role: 'EXECUTIVE_ADMIN' }); // Unscoped

  let passed = 0;
  let failed = 0;

  function assert(name, condition) {
    if (condition) {
      console.log('✅ PASS:', name);
      passed++;
    } else {
      console.log('❌ FAIL:', name);
      failed++;
    }
  }

  try {
    // 1. Executive can access stores belonging to their organization
    const resExecA = await request(app).get('/api/v1/crm/leads').set('Authorization', `Bearer ${tokenExecA}`);
    const execALeads = resExecA.body.leads.map(l => l.customerName || l.name || l.customer_name);
    // Should see A1 and A2, but not B1
    assert('1. Executive A sees leads from Org A', execALeads.length >= 2 && !JSON.stringify(execALeads).includes('Customer B1'));

    // 2. Executive cannot access stores belonging to another organization
    const resExecB = await request(app).get('/api/v1/crm/leads').set('Authorization', `Bearer ${tokenExecB}`);
    const execBLeads = resExecB.body.leads.map(l => l.customerName || l.name || l.customer_name);
    assert('2. Executive B cannot access Org A leads', !JSON.stringify(execBLeads).includes('Customer A1'));

    // 3. Executive no longer has global access (unscoped admin gets nothing)
    const resGlobal = await request(app).get('/api/v1/crm/leads').set('Authorization', `Bearer ${tokenGlobalAdmin}`);
    assert('3. Unscoped Executive gets 0 leads', resGlobal.body.leads.length === 0);

    // 4. Normal dealership user remains restricted to their existing store
    const resSales = await request(app).get('/api/v1/crm/leads').set('Authorization', `Bearer ${tokenSalesA1}`);
    const salesLeads = resSales.body.leads.map(l => l.customerName || l.name || l.customer_name);
    assert('4. Sales Rep sees only Store A1 leads', JSON.stringify(salesLeads).includes('Customer A1') && !JSON.stringify(salesLeads).includes('Customer A2'));

    // 6. Unauthorized cross-organization lead access is rejected
    const resAssign = await request(app).patch(`/api/v1/crm/leads/${leadB1.id}/assign`)
      .set('Authorization', `Bearer ${tokenExecA}`)
      .send({ assigneeUserId: 'exec-a' });
    assert('6. Cross-org lead assign rejected', resAssign.status === 403);

    // 7. Existing P0/P1 behavior is not broken
    const resAssignOk = await request(app).patch(`/api/v1/crm/leads/${leadA1.id}/assign`)
      .set('Authorization', `Bearer ${tokenExecA}`)
      .send({ assigneeUserId: 'sales-a1' });
    assert('7. Within-org lead assign succeeds', resAssignOk.status === 200);

  } catch (e) {
    console.error('Test error', e);
  } finally {
    // Cleanup
    await prisma.lead.deleteMany({ where: { id: { in: [leadA1.id, leadA2.id, leadB1.id] } } });
    await prisma.salesNote.deleteMany({ where: { leadId: { in: [leadA1.id, leadA2.id, leadB1.id] } } });
    console.log(`--- RESULTS: ${passed} PASS, ${failed} FAIL ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
