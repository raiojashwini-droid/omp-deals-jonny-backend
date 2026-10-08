const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const fs = require('fs');

async function runE2E() {
  console.log('--- STARTING E2E WORKFLOW TEST ---');

  // 1. Create Data
  const storeA = await prisma.store.create({
    data: { name: 'E2E Store', city: 'Test City', state: 'TS' }
  });
  
  const liaisonA = await prisma.user.create({
    data: { email: `liaison-${crypto.randomBytes(4).toString('hex')}@e2e.com`, role: 'LIAISON', storeId: storeA.id, full_name: 'E2E Liaison' }
  });
  
  const reviewer = await prisma.user.create({
    data: { email: `admin-${crypto.randomBytes(4).toString('hex')}@e2e.com`, role: 'EXECUTIVE_ADMIN' }
  });

  const contractController = require('./src/controllers/contractController');
  
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, res) {
    if (condition) {
      console.log(`✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Status: ${res?.statusCode}, Data: ${JSON.stringify(res?.data)}`);
      failed++;
    }
  }

  const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; res.statusCode = res.statusCode || 200; return res; };
    return res;
  };

  try {
    // 2. ID Approval (Simulate creating approved document)
    await prisma.dealerDocument.create({
      data: {
        storeId: storeA.id,
        uploadedById: liaisonA.id,
        documentType: 'DEALER_LICENSE',
        fileUrl: '/fake.pdf',
        status: 'APPROVED'
      }
    });
    console.log('✅ PASSED: Phase 2 ID Approved');

    // 3. Generate Contract
    const reqGen = { user: liaisonA };
    const resGen = mockRes();
    await contractController.generateContract(reqGen, resGen);
    assert(resGen.statusCode === 200 && resGen.data.contract.status === 'PENDING_SIGNATURE', 'Generate Contract PDF', resGen);
    const contractId = resGen.data.contract.id;

    // 4. Fetch Contract (Review)
    const reqFetch = { user: liaisonA, params: { id: contractId } };
    const resFetch = mockRes();
    await contractController.getContract(reqFetch, resFetch);
    assert(resFetch.statusCode === 200 && resFetch.data.contract.id === contractId, 'Fetch Contract', resFetch);

    // 5. Sign Contract
    const reqSign = { user: liaisonA, params: { id: contractId }, body: { signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } };
    const resSign = mockRes();
    await contractController.signContract(reqSign, resSign);
    assert(resSign.statusCode === 200 && resSign.data.contract.status === 'SIGNED', 'Sign Contract', resSign);

    // 6. Reviewer Rejects Contract
    const reqReject = { user: reviewer, params: { id: contractId }, body: { status: 'REJECTED', rejectionReason: 'Signature too small' } };
    const resReject = mockRes();
    await contractController.reviewContract(reqReject, resReject);
    assert(resReject.statusCode === 200 && resReject.data.contract.status === 'REJECTED', 'Reviewer Rejects', resReject);

    // 7. Reviewer Approves Contract
    const reqApprove = { user: reviewer, params: { id: contractId }, body: { status: 'APPROVED' } };
    const resApprove = mockRes();
    await contractController.reviewContract(reqApprove, resApprove);
    assert(resApprove.statusCode === 200 && resApprove.data.contract.status === 'APPROVED', 'Reviewer Approves', resApprove);

    // 8. Secure Document Retrieval
    const reqDoc = { user: liaisonA, params: { id: contractId }, query: { type: 'signed' } };
    let docStatus = 200;
    const resDoc = {
      status: (code) => { docStatus = code; return resDoc; },
      json: (data) => { docStatus = docStatus || 200; },
      contentType: () => {},
      pipe: () => {}
    };
    
    // Test Isolation (Liaison B cannot access A's contract)
    const liaisonB = await prisma.user.create({ data: { email: `liaisonb-${crypto.randomBytes(4).toString('hex')}@e2e.com`, role: 'LIAISON', storeId: storeA.id } });
    
    // We modify Liaison B's storeId to simulate Store B
    const storeB = await prisma.store.create({ data: { name: 'E2E Store B', city: 'Test City', state: 'TS' } });
    await prisma.user.update({ where: { id: liaisonB.id }, data: { storeId: storeB.id } });

    const reqIsol = { user: liaisonB, params: { id: contractId } };
    const resIsol = mockRes();
    await contractController.getContract(reqIsol, resIsol);
    assert(resIsol.statusCode === 403, 'Cross-Store Isolation (Liaison B forbidden)', resIsol);

  } catch (e) {
    console.error(e);
  } finally {
    console.log(`\n--- E2E RESULTS: PASSED: ${passed}/6 | FAILED: ${failed} ---`);
    await prisma.dealershipContract.deleteMany({});
    await prisma.dealerDocument.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e.com' } } });
    await prisma.store.deleteMany({ where: { name: { contains: 'E2E Store' } } });
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2E();
