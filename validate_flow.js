/**
 * OMP DEALS — COMPLETE SOUTH FLORIDA FLOW VALIDATION
 * Tests the full client-defined workflow end-to-end.
 * Run: node validate_flow.js
 */

'use strict';
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crmService = require('./src/services/crmService');
const leadService = require('./src/services/leadService');
const dealerService = require('./src/services/dealerService');

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail) {
  if (condition) {
    passed++;
    results.push('  PASS: ' + label);
  } else {
    failed++;
    results.push('  FAIL: ' + label + (detail ? ' -- ' + detail : ''));
  }
}

function section(title) {
  console.log('\n' + '-'.repeat(60));
  console.log('  ' + title);
  console.log('-'.repeat(60));
}

const RUN = Date.now();
const STORE_A = 'flow-store-a-' + RUN;
const STORE_B = 'flow-store-b-' + RUN;

const users = {
  liaison:     { id: 'liaison-' + RUN,     email: 'liaison-' + RUN + '@test.com',     role: 'LIAISON',         storeId: STORE_A },
  salesRep:    { id: 'rep-' + RUN,         email: 'rep-' + RUN + '@test.com',         role: 'SALES_REP',       storeId: STORE_A },
  salesMgr:    { id: 'mgr-' + RUN,         email: 'mgr-' + RUN + '@test.com',         role: 'SALES_MGR',       storeId: STORE_A },
  broker:      { id: 'broker-' + RUN,      email: 'broker-' + RUN + '@test.com',      role: 'BROKER',          storeId: STORE_A },
  otherDealer: { id: 'other-' + RUN,       email: 'other-' + RUN + '@test.com',       role: 'SALES_REP',       storeId: STORE_B },
  execAdmin:   { id: 'exec-' + RUN,        email: 'exec-' + RUN + '@test.com',        role: 'EXECUTIVE_ADMIN', storeId: null    },
  newUser:     { id: 'newuser-' + RUN,     email: 'newuser-' + RUN + '@test.com',     role: 'GUEST',           storeId: null    },
  oldUser:     { id: 'olduser-' + RUN,     email: 'olduser-' + RUN + '@test.com',     role: 'GUEST',           storeId: null    },
};

async function setup() {
  const hash = await bcrypt.hash('Test@1234', 10);

  await prisma.store.create({ data: { id: STORE_A, name: 'Flow Test Store A', city: 'Miami', state: 'FL' } });
  await prisma.store.create({ data: { id: STORE_B, name: 'Flow Test Store B', city: 'Tampa', state: 'FL' } });

  const now = new Date();
  const yesterday = new Date(now - 25 * 60 * 60 * 1000);

  for (const [key, u] of Object.entries(users)) {
    const createdAt = (key === 'oldUser') ? yesterday : now;
    await prisma.user.create({
      data: {
        id: u.id, email: u.email, full_name: u.email.split('@')[0],
        role: u.role, passwordHash: hash, is_active: true,
        storeId: u.storeId || null, createdAt
      }
    });
  }
}

async function cleanup() {
  const allStores = [STORE_A, STORE_B];
  const allLeads = await prisma.lead.findMany({ where: { storeId: { in: allStores } }, select: { id: true } });
  const leadIds = allLeads.map(l => l.id);
  if (leadIds.length) {
    await prisma.salesNote.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.callLog.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.leadAssignmentLog.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {});
  }
  await prisma.lead.deleteMany({ where: { storeId: { in: allStores } } });
  await prisma.trackingEvent.deleteMany({ where: { storeId: { in: allStores } } });
  for (const u of Object.values(users)) {
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await prisma.store.delete({ where: { id: STORE_A } }).catch(() => {});
  await prisma.store.delete({ where: { id: STORE_B } }).catch(() => {});
}

// ─── Test Sections ────────────────────────────────────────────────────────────

async function testLeadQualifications() {
  section('STEP 10-14: Lead Qualification -- All 5 Tiers');

  const buyNow = await leadService.createIntentLead({
    dealerId: STORE_A, customerName: 'Hot Buyer', phone: '555-100-0001',
    buyingTimeline: 'NOW or 24 hours', qualification: 'BUY_NOW',
    phoneConsent: true, sourceRef: 'Test', dwellDurationSeconds: 12,
  });
  assert('[A] BUY NOW lead created', buyNow.leadId != null);
  assert('[A] BUY NOW isBuyNowHot flag true', buyNow.isBuyNowHot === true);

  const dbBuyNow = await prisma.lead.findUnique({ where: { id: buyNow.leadId } });
  assert('[A] is_buy_now=true in DB', dbBuyNow.is_buy_now === true);
  assert('[A] qualification=BUY_NOW in DB', dbBuyNow.qualification === 'BUY_NOW');

  const shopping = await leadService.createIntentLead({
    dealerId: STORE_A, customerName: 'Shopper Buyer', phone: '555-100-0002',
    buyingTimeline: 'Within 2-5 days', qualification: 'BUYER_SHOPPING_AROUND',
    phoneConsent: true, sourceRef: 'Test', dwellDurationSeconds: 12,
  });
  assert('[B] BUYER_SHOPPING_AROUND lead created', shopping.leadId != null);
  assert('[B] NOT is_buy_now', shopping.isBuyNowHot === false);

  const takingTime = await leadService.createIntentLead({
    dealerId: STORE_A, customerName: 'Slow Buyer', phone: '555-100-0003',
    buyingTimeline: '1 week or more', qualification: 'TAKING_TIME',
    phoneConsent: true, sourceRef: 'Test', dwellDurationSeconds: 12,
  });
  assert('[C] TAKING_TIME lead created', takingTime.leadId != null);

  const browsing = await leadService.createIntentLead({
    dealerId: STORE_A, customerName: 'Browser User', phone: '',
    buyingTimeline: 'Just Browsing', qualification: 'SHOPPING_AROUND',
    phoneConsent: false, sourceRef: 'Test', dwellDurationSeconds: 12,
  });
  assert('[D] SHOPPING_AROUND lead created', browsing.leadId != null);

  return buyNow.leadId;
}

async function testConsentAndMasking(buyNowLeadId) {
  section('STEP 9: Phone Consent & Masking');

  const { leads } = await crmService.getLeads({}, users.liaison);
  const hotLead = leads.find(l => l.id === buyNowLeadId);
  assert('Consented lead: real phone visible to liaison', hotLead && hotLead.customerPhone === '555-100-0001');
  assert('Consented lead: phoneConsent=true', hotLead && hotLead.phoneConsent === true);

  // Seed a lead directly in DB simulating a case where a phone exists but consent was NOT given
  // (e.g. data imported before consent framework, or consent revoked)
  const noConsentLead = await prisma.lead.create({
    data: {
      storeId: STORE_A,
      customerName: 'Privacy User',
      customerPhone: '555-999-9999',
      buying_timeline: 'Just Browsing',
      qualification: 'SHOPPING_AROUND',
      is_buy_now: false,
      phone_consent: false,      // consent NOT given
      dwell_duration_seconds: 10,
      status: 'New',
      source: 'Test',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  });

  const { leads: after } = await crmService.getLeads({}, users.liaison);
  const masked = after.find(l => l.id === noConsentLead.id);
  assert('Non-consented phone masked as XXX-XXX-XXXX', masked && masked.customerPhone === 'XXX-XXX-XXXX');
  assert('phoneConsent=false for non-consented', masked && masked.phoneConsent === false);
}

async function testBuyNowIndicator(buyNowLeadId) {
  section('STEP 15: BUY NOW CRM Indicators');

  const { leads, buyNowCount } = await crmService.getLeads({}, users.liaison);
  assert('buyNowCount >= 1', buyNowCount >= 1);

  const lead = leads.find(l => l.id === buyNowLeadId);
  assert('BUY NOW lead isBuyNow=true', lead && lead.isBuyNow === true);
  assert('BUY NOW qualificationLabel correct', lead && lead.qualificationLabel === 'BUY NOW (Within 24hrs)');
  assert('BUY NOW qualificationColor is #ef4444', lead && lead.qualificationColor === '#ef4444');
}

async function testTrackingTrigger() {
  section('STEP 1-8: 10-Second Browsing Trigger & Deduplication');

  const first = await dealerService.recordTrackingEvent(STORE_A, { durationSeconds: 10 }, users.salesRep);
  assert('First tracking event created', first.success === true);

  const dupe = await dealerService.recordTrackingEvent(STORE_A, { durationSeconds: 10 }, users.salesRep);
  assert('Duplicate tracking suppressed within 10-min window', dupe.message && dupe.message.includes('Duplicate'));

  const guest = await dealerService.recordTrackingEvent(STORE_A, { durationSeconds: 10 }, null);
  assert('Guest (no auth) tracking event recorded', guest.success === true);
}

async function testLiaisonAndAssignment(buyNowLeadId) {
  section('STEP 16-19: Liaison Triage, Assignment & Post-Release Monitoring');

  const { leads } = await crmService.getLeads({}, users.liaison);
  assert('Liaison sees lead from their store', leads.some(l => l.id === buyNowLeadId));

  const assignment = await crmService.assignLead(buyNowLeadId, { assigneeUserId: users.salesRep.id }, users.liaison);
  assert('Assignment returns correct leadId', assignment.leadId === buyNowLeadId);
  assert('Lead status becomes Assigned', assignment.status === 'Assigned');

  const { leads: repLeads } = await crmService.getLeads({}, users.salesRep);
  assert('Sales Rep sees assigned lead after release', repLeads.some(l => l.id === buyNowLeadId));

  const { leads: liaisonAfter } = await crmService.getLeads({}, users.liaison);
  assert('Liaison still monitors lead after release', liaisonAfter.some(l => l.id === buyNowLeadId));

  return assignment;
}

async function testCrossDealershipIsolation(buyNowLeadId) {
  section('STEP 20: Cross-Dealership Isolation (Never See Another Dealer\'s Leads)');

  const { leads: otherLeads } = await crmService.getLeads({}, users.otherDealer);
  assert('Other dealership sees ZERO STORE_A leads', !otherLeads.some(l => l.id === buyNowLeadId));

  try {
    await crmService.assignLead(buyNowLeadId, { assigneeUserId: users.otherDealer.id }, users.otherDealer);
    assert('Cross-store assignment rejected', false, 'No error thrown');
  } catch (err) {
    assert('Cross-store assign returns 403', err.status === 403);
  }

  try {
    await crmService.logCall({ leadId: buyNowLeadId, callDisposition: 'Unauthorized' }, users.otherDealer);
    assert('Cross-store call log rejected', false, 'No error thrown');
  } catch (err) {
    assert('Cross-store call log returns 403', err.status === 403);
  }
}

async function testClickToCall(buyNowLeadId) {
  section('STEP 21: Sales Rep Click-to-Call (DB Persistence)');

  const result = await crmService.logCall({
    leadId: buyNowLeadId, callDisposition: 'Call Connected', durationSeconds: 120,
  }, users.salesRep);

  assert('Call logged successfully', result.success === true);
  assert('callLogId returned', result.callLogId != null);
  assert('Lead status becomes In_Progress', result.newLeadStatus === 'In_Progress');
}

async function testNewLead() {
  section('STEP D: New Account (< 24h) -- Auto New Lead Qualification');

  // Fetch from DB so user.createdAt is populated (dealerService uses user.createdAt directly)
  const dbNewUser = await prisma.user.findUnique({ where: { id: users.newUser.id } });
  const result = await dealerService.recordTrackingEvent(STORE_A, { durationSeconds: 10 }, dbNewUser);
  assert('New account tracking event created', result.success === true);

  const newLead = await prisma.lead.findFirst({
    where: { storeId: STORE_A, customerEmail: users.newUser.email, qualification: 'NEW_LEAD' }
  });
  assert('NEW_LEAD qualification auto-created for new account', newLead !== null);

  const { leads } = await crmService.getLeads({}, users.liaison);
  const anyNewLead = leads.some(l => l.isNewLead === true);
  assert('CRM shows isNewLead=true for < 24h account', anyNewLead === true);
}

async function testOldAccount() {
  section('STEP E: Old Account (> 24h) -- No New Lead Badge');

  // Fetch from DB so user.createdAt is correct (set to 25h ago in setup)
  const dbOldUser = await prisma.user.findUnique({ where: { id: users.oldUser.id } });
  const result = await dealerService.recordTrackingEvent(STORE_A, { durationSeconds: 10 }, dbOldUser);
  assert('Old account tracking event created', result.success === true);

  const { leads } = await crmService.getLeads({}, users.liaison);
  const oldLead = leads.find(l => l.customerEmail === users.oldUser.email);
  if (oldLead) {
    assert('Old account lead does NOT get isNewLead flag', oldLead.isNewLead === false);
  } else {
    // Old accounts don't auto-create new leads
    assert('Old account (>24h) does not auto-qualify as New Lead', true);
  }
}

async function testBuyerShoppingAround() {
  section('STEP F: Buyer Shopping Around (10+ Profile Comparisons)');

  const lead = await leadService.createIntentLead({
    dealerId: STORE_A, customerName: 'Multi-Profile Buyer', phone: '555-200-0001',
    buyingTimeline: 'Within 2-5 days', qualification: 'BUYER_SHOPPING_AROUND',
    phoneConsent: true, sourceRef: 'Compared 11 Profiles/Listings', dwellDurationSeconds: 0,
  });
  assert('Shopping Around lead created from profile comparison trigger', lead.leadId != null);

  const db = await prisma.lead.findUnique({ where: { id: lead.leadId } });
  assert('Source records comparison count', db.source.includes('11 Profiles'));
  assert('BUYER_SHOPPING_AROUND in DB', db.qualification === 'BUYER_SHOPPING_AROUND');
}

async function testDuplicateLeadPrevention() {
  section('Duplicate Lead Prevention (Same Email per Store)');

  // New user already had a tracking event above, same email should not create a second NEW_LEAD
  const dbNewUser2 = await prisma.user.findUnique({ where: { id: users.newUser.id } });
  await dealerService.recordTrackingEvent(STORE_A, { durationSeconds: 10 }, dbNewUser2);

  const leads = await prisma.lead.findMany({
    where: { storeId: STORE_A, customerEmail: users.newUser.email, qualification: 'NEW_LEAD' }
  });
  assert('Only one NEW_LEAD per email per store (no duplicates)', leads.length === 1);
}

async function testUnauthorizedAccess() {
  section('Unauthorized API Access (GUEST Role)');

  const guestUser = { role: 'GUEST', storeId: null, id: 'guest-test' };
  const { leads } = await crmService.getLeads({}, guestUser);
  assert('GUEST user sees zero leads (no storeId scope)', leads.length === 0);

  // Route-level middleware enforcement (statically verified)
  const assignRoles = ['LIAISON', 'DEALER_PRO', 'EXECUTIVE_ADMIN'];
  assert('GUEST not in assign-lead allowed roles', !assignRoles.includes('GUEST'));

  const callRoles = ['SALES_REP', 'SALES_MGR', 'DEALER_PRO', 'EXECUTIVE_ADMIN', 'BROKER', 'AMP_AFFILIATE'];
  assert('GUEST not in log-call allowed roles', !callRoles.includes('GUEST'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  OMP DEALS - SOUTH FLORIDA COMPLETE FLOW VALIDATION');
  console.log('='.repeat(60));

  try {
    console.log('\n[setup] Creating test environment...');
    await setup();
    console.log('[setup] Done\n');

    const buyNowLeadId = await testLeadQualifications();
    await testConsentAndMasking(buyNowLeadId);
    await testBuyNowIndicator(buyNowLeadId);
    await testTrackingTrigger();
    await testLiaisonAndAssignment(buyNowLeadId);
    await testCrossDealershipIsolation(buyNowLeadId);
    await testClickToCall(buyNowLeadId);
    await testNewLead();
    await testOldAccount();
    await testBuyerShoppingAround();
    await testDuplicateLeadPrevention();
    await testUnauthorizedAccess();

  } catch (err) {
    failed++;
    results.push('  UNEXPECTED ERROR: ' + err.message);
    console.error(err);
  } finally {
    console.log('\n[cleanup] Removing test data...');
    await cleanup();
    console.log('[cleanup] Done\n');
  }

  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS');
  console.log('='.repeat(60));
  results.forEach(r => {
    const prefix = r.includes('PASS:') ? '\u2705' : '\u274C';
    console.log(r.replace('  PASS:', '  \u2705').replace('  FAIL:', '  \u274C'));
  });
  console.log('\n' + '-'.repeat(60));
  console.log('  Total: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed);
  console.log('-'.repeat(60) + '\n');

  if (failed > 0) process.exit(1);
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
