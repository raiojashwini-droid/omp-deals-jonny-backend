const request = require('supertest');
const app = require('./src/app');
const prisma = require('./src/config/prisma');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'omp_secret_key_2024';

const mockToken = (userPayload) => jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

async function runTests() {
  console.log('--- Setting up test data ---');
  const orgAId = 'org-p22-a';
  const orgBId = 'org-p22-b';
  const storeA1Id = 'store-p22-a1';
  const storeA2Id = 'store-p22-a2';
  const storeB1Id = 'store-p22-b1';

  await prisma.organization.upsert({ where: { id: orgAId }, update: {}, create: { id: orgAId, name: 'Org A' } });
  await prisma.organization.upsert({ where: { id: orgBId }, update: {}, create: { id: orgBId, name: 'Org B' } });

  await prisma.store.upsert({ where: { id: storeA1Id }, update: { organizationId: orgAId }, create: { id: storeA1Id, name: 'Store A1', city: 'City A1', state: 'TX', organizationId: orgAId } });
  await prisma.store.upsert({ where: { id: storeA2Id }, update: { organizationId: orgAId }, create: { id: storeA2Id, name: 'Store A2', city: 'City A2', state: 'TX', organizationId: orgAId } });
  await prisma.store.upsert({ where: { id: storeB1Id }, update: { organizationId: orgBId }, create: { id: storeB1Id, name: 'Store B1', city: 'City B1', state: 'TX', organizationId: orgBId } });

  await prisma.user.upsert({ where: { email: 'execP22A@test.com' }, update: { role: 'EXECUTIVE_ADMIN', organizationId: orgAId }, create: { id: 'exec-p22-a', email: 'execP22A@test.com', role: 'EXECUTIVE_ADMIN', organizationId: orgAId } });
  await prisma.user.upsert({ where: { email: 'execP22B@test.com' }, update: { role: 'EXECUTIVE_ADMIN', organizationId: orgBId }, create: { id: 'exec-p22-b', email: 'execP22B@test.com', role: 'EXECUTIVE_ADMIN', organizationId: orgBId } });
  await prisma.user.upsert({ where: { email: 'salesP22@test.com' }, update: { role: 'SALES_REP', storeId: storeA1Id }, create: { id: 'sales-p22', email: 'salesP22@test.com', role: 'SALES_REP', storeId: storeA1Id } });

  const tokenExecA = mockToken({ id: 'exec-p22-a', role: 'EXECUTIVE_ADMIN', organizationId: orgAId });
  const tokenExecB = mockToken({ id: 'exec-p22-b', role: 'EXECUTIVE_ADMIN', organizationId: orgBId });
  const tokenSales = mockToken({ id: 'sales-p22', role: 'SALES_REP', storeId: storeA1Id });
  const tokenGlobal = mockToken({ id: 'exec-global', role: 'EXECUTIVE_ADMIN' });

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
    // 1. Executive can retrieve own organization stores
    const resStoresA = await request(app).get('/api/v1/executive/stores').set('Authorization', `Bearer ${tokenExecA}`);
    assert('1. Executive can retrieve own organization stores', resStoresA.body.success && resStoresA.body.data.length === 2);

    // 2. Executive cannot retrieve another organization's stores
    const resStoresB = await request(app).get('/api/v1/executive/stores').set('Authorization', `Bearer ${tokenExecB}`);
    assert('2. Executive cannot retrieve another org stores', resStoresB.body.success && resStoresB.body.data.length === 1 && resStoresB.body.data[0].id === storeB1Id);

    // 3. Executive can report on one authorized Store
    const resRep1 = await request(app).get(`/api/v1/executive/reports?storeIds=${storeA1Id}`).set('Authorization', `Bearer ${tokenExecA}`);
    assert('3. Executive can report on one authorized Store', resRep1.body.success && resRep1.body.data.branches.length === 1);

    // 4. Executive can report on multiple authorized Stores
    const resRep2 = await request(app).get(`/api/v1/executive/reports?storeIds=${storeA1Id},${storeA2Id}`).set('Authorization', `Bearer ${tokenExecA}`);
    assert('4. Executive can report on multiple authorized Stores', resRep2.body.success && resRep2.body.data.branches.length === 2);

    // 5. Executive can report on all authorized Stores (no storeIds param)
    const resRepAll = await request(app).get(`/api/v1/executive/reports`).set('Authorization', `Bearer ${tokenExecA}`);
    assert('5. Executive can report on all authorized Stores', resRepAll.body.success && resRepAll.body.data.branches.length === 2);

    // 6. Mixed authorized + unauthorized Store IDs are rejected completely
    const resRepMixed = await request(app).get(`/api/v1/executive/reports?storeIds=${storeA1Id},${storeB1Id}`).set('Authorization', `Bearer ${tokenExecA}`);
    assert('6. Mixed authorized + unauthorized Store IDs are rejected', resRepMixed.status === 403);

    // 7. Another Executive from another Organization cannot access the first Organization
    const resRepB = await request(app).get(`/api/v1/executive/reports?storeIds=${storeA1Id}`).set('Authorization', `Bearer ${tokenExecB}`);
    assert('7. Executive B cannot report on Org A store', resRepB.status === 403);

    // 8. Normal dealership user cannot access Central Office executive APIs
    const resSales = await request(app).get(`/api/v1/executive/stores`).set('Authorization', `Bearer ${tokenSales}`);
    assert('8. Normal user cannot access executive APIs', resSales.status === 403);

    // 9. Executive with no organizationId cannot access
    const resGlobal = await request(app).get(`/api/v1/executive/stores`).set('Authorization', `Bearer ${tokenGlobal}`);
    assert('9. Executive without orgId gets 403', resGlobal.status === 403);

  } catch (e) {
    console.error(e);
  } finally {
    console.log(`--- RESULTS: ${passed} PASS, ${failed} FAIL ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
