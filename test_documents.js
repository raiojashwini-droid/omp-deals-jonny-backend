const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const MOCK_JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_987654321';

async function runTests() {
  console.log('--- STARTING DOCUMENT UPLOAD & VERIFICATION TESTS ---');

  // 1. Setup Test Data
  const storeA = await prisma.store.create({
    data: { name: 'Test Store A', city: 'Miami', state: 'FL' }
  });
  const storeB = await prisma.store.create({
    data: { name: 'Test Store B', city: 'Orlando', state: 'FL' }
  });

  const liaisonA = await prisma.user.create({
    data: { role: 'LIAISON', storeId: storeA.id, email: 'liaisona@test.com' }
  });
  const liaisonB = await prisma.user.create({
    data: { role: 'LIAISON', storeId: storeB.id, email: 'liaisonb@test.com' }
  });
  const reviewer = await prisma.user.create({
    data: { role: 'EXECUTIVE_ADMIN', email: 'admin@test.com' }
  });

  // Since we are not doing full HTTP tests with supertest in this script,
  // we will test the controller logic directly by mocking req/res, OR
  // we can test the database constraints and isolation manually.
  
  // Here we test using the controller directly
  const documentController = require('./src/controllers/documentController');
  
  let passed = 0;
  let failed = 0;
  let total = 0;

  function assert(condition, testName, res) {
    total++;
    if (condition) {
      console.log(`✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.log(`❌ FAILED: ${testName} (Status: ${res?.statusCode}, Data: ${JSON.stringify(res?.data)})`);
      failed++;
    }
  }

  // Mock Request/Response
  const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; res.statusCode = res.statusCode || 200; return res; };
    return res;
  };

  try {
    // Test 1: Upload creates PENDING record
    const req1 = {
      user: liaisonA,
      file: { filename: 'test.pdf', originalname: 'test.pdf', mimetype: 'application/pdf', size: 1024 },
      body: { documentType: 'DEALER_LICENSE' }
    };
    const res1 = mockRes();
    await documentController.uploadDocument(req1, res1);
    assert(res1.statusCode === 201 && res1.data.document.status === 'PENDING', 'Upload creates PENDING record', res1);

    const docId = res1.data.document.id;

    // Test 2: Dealership Isolation - Liaison B cannot see Liaison A's document
    const req2 = { user: liaisonB };
    const res2 = mockRes();
    await documentController.getDocuments(req2, res2);
    assert(res2.statusCode === 200 && res2.data.documents.length === 0, 'Dealership Isolation (Liaison B sees 0 docs)', res2);

    // Test 3: Dealership Isolation - Liaison A sees their document
    const req3 = { user: liaisonA };
    const res3 = mockRes();
    await documentController.getDocuments(req3, res3);
    assert(res3.statusCode === 200 && res3.data.documents.length === 1, 'Dealership Isolation (Liaison A sees 1 doc)', res3);

    // Test 4: Liaison cannot approve own document
    const req4 = {
      user: liaisonA,
      params: { id: docId },
      body: { status: 'APPROVED' }
    };
    const res4 = mockRes();
    await documentController.reviewDocument(req4, res4);
    assert(res4.statusCode === 403, 'Liaison cannot review own document', res4);

    // Test 5: Authorized reviewer can REJECT and save reason
    const req5 = {
      user: reviewer,
      params: { id: docId },
      body: { status: 'REJECTED', rejectionReason: 'Blurry image' }
    };
    const res5 = mockRes();
    await documentController.reviewDocument(req5, res5);
    assert(res5.statusCode === 200 && res5.data.document.status === 'REJECTED' && res5.data.document.rejectionReason === 'Blurry image', 'Reviewer can REJECT and save reason', res5);

    // Test 6: Authorized reviewer can APPROVE
    const req6 = {
      user: reviewer,
      params: { id: docId },
      body: { status: 'APPROVED' }
    };
    const res6 = mockRes();
    await documentController.reviewDocument(req6, res6);
    assert(res6.statusCode === 200 && res6.data.document.status === 'APPROVED', 'Reviewer can APPROVE', res6);

  } catch (err) {
    console.error(err);
  } finally {
    // Cleanup
    await prisma.dealerDocument.deleteMany({});
    await prisma.user.deleteMany({ where: { id: { in: [liaisonA.id, liaisonB.id, reviewer.id] } } });
    await prisma.store.deleteMany({ where: { id: { in: [storeA.id, storeB.id] } } });
    await prisma.$disconnect();
    
    console.log(`\n--- TEST RESULTS: PASSED: ${passed} / FAILED: ${failed} / TOTAL: ${total} ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
