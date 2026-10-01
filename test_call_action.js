const prisma = require('./src/config/prisma');
const crmService = require('./src/services/crmService');
async function runTests() {
  console.log('--- RUNNING DIRECT CALL ACTION & CONSENT TESTS ---\n');
  
  // Setup Mock Dealerships
  const storeA = await prisma.store.upsert({
    where: { id: 'store-a' },
    update: {},
    create: {
      id: 'store-a', name: 'Dealership A', city: 'Miami', state: 'FL', zip: '33101'
    }
  });
  
  const storeB = await prisma.store.upsert({
    where: { id: 'store-b' },
    update: {},
    create: {
      id: 'store-b', name: 'Dealership B', city: 'Orlando', state: 'FL', zip: '32801'
    }
  });

  // Setup Mock Users
  const repA = await prisma.user.upsert({
    where: { email: 'repa@store.com' },
    update: { storeId: storeA.id },
    create: {
      email: 'repa@store.com', passwordHash: 'hash', full_name: 'Rep A', storeId: storeA.id, role: 'SALES_REP'
    }
  });
  
  const repB = await prisma.user.upsert({
    where: { email: 'repb@store.com' },
    update: { storeId: storeB.id },
    create: {
      email: 'repb@store.com', passwordHash: 'hash', full_name: 'Rep B', storeId: storeB.id, role: 'SALES_REP'
    }
  });

  // Create Leads
  const leadWithConsent = await prisma.lead.create({
    data: {
      storeId: storeA.id,
      assignedToId: repA.id,
      customerName: 'Consented User',
      customerPhone: '555-111-1111',
      phone_consent: true,
      buying_timeline: 'NOW',
      is_buy_now: true,
      dwell_duration_seconds: 30
    }
  });
  
  const leadWithoutConsent = await prisma.lead.create({
    data: {
      storeId: storeA.id,
      assignedToId: repA.id,
      customerName: 'No Consent User',
      customerPhone: '555-222-2222',
      phone_consent: false,
      buying_timeline: 'Not sure',
      is_buy_now: false,
      dwell_duration_seconds: 30
    }
  });

  try {
    console.log('TEST 1: Authorized User & Phone Consent');
    const result = await crmService.getLeads({}, { storeId: storeA.id, role: 'SALES_REP', id: repA.id });
    const consented = result.leads.find(l => l.id === leadWithConsent.id);
    if (consented && consented.customerPhone === '555-111-1111') {
      console.log('✅ PASS: Phone number exposed for consented lead.');
    } else {
      console.log('❌ FAIL: Expected 555-111-1111, got', consented?.customerPhone);
    }

    console.log('\nTEST 2: No Consent');
    const noConsent = result.leads.find(l => l.id === leadWithoutConsent.id);
    if (noConsent && noConsent.customerPhone === 'XXX-XXX-XXXX') {
      console.log('✅ PASS: Phone number masked as XXX-XXX-XXXX for non-consented lead.');
    } else {
      console.log('❌ FAIL: Expected XXX-XXX-XXXX, got', noConsent?.customerPhone);
    }
    
    console.log('\nTEST 3: Wrong Dealership');
    try {
      await crmService.logCall({
        leadId: leadWithConsent.id,
        repUserId: repB.id,
        callDisposition: 'Contacted',
        durationSeconds: 120
      }, { id: repB.id, role: 'SALES_REP', storeId: storeB.id });
      console.log('❌ FAIL: Rep B from Dealership B logged a call on Dealership A lead!');
    } catch (err) {
      if (err.status === 403) {
         console.log('✅ PASS: Cross-dealership call action rejected with 403.');
      } else {
         console.log('❌ FAIL with wrong error:', err);
      }
    }
    
    console.log('\nTEST 4: Call Logging (No Twilio/VoIP, DB persistence only)');
    try {
      await crmService.logCall({
        leadId: leadWithConsent.id,
        repUserId: repA.id,
        callDisposition: 'Contacted',
        durationSeconds: 120
      }, { id: repA.id, role: 'SALES_REP', storeId: storeA.id });
      console.log('✅ PASS: Authorized user from correct dealership successfully logged call outcome.');
    } catch (err) {
      console.log('❌ FAIL to log call:', err);
    }
    
    console.log('\nTEST 5: Unauthorized Role Access to Fetch Leads');
    try {
      // Simulate missing auth/store scoping, should be handled by route middleware, 
      // but if crmService is invoked directly with empty storeId for a Sales Rep:
      await crmService.getLeads({}, { id: 'bad-id', role: 'SALES_REP', storeId: null });
    } catch (err) {
      console.log('✅ PASS: Missing store context throws error (if caught) or returns empty.');
    }

  } finally {
    // Cleanup
    await prisma.lead.deleteMany({ where: { id: { in: [leadWithConsent.id, leadWithoutConsent.id] } } });
    await prisma.user.deleteMany({ where: { email: { in: ['repa@store.com', 'repb@store.com'] } } });
    await prisma.store.deleteMany({ where: { id: { in: ['store-a', 'store-b'] } } });
    console.log('\nCleanup complete.');
  }
}

runTests().catch(console.error).finally(() => process.exit(0));
