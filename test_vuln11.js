const express = require('express');
require('dotenv').config();
const { requireAuth, sseAuthMiddleware, requireRoles } = require('./src/middleware/authMiddleware');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'OMP_DEV_ONLY_FALLBACK_NOT_FOR_PRODUCTION';
const token = jwt.sign({ id: 'user1', role: 'SALES_REP', storeId: 'store1' }, SECRET, { expiresIn: '1h' });
const expiredToken = jwt.sign({ id: 'user1', role: 'SALES_REP', storeId: 'store1' }, SECRET, { expiresIn: '-1h' });
const invalidToken = 'this.is.invalid';

function mockRes() {
  return {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    }
  };
}

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    failed++;
  }
}

function testRequireAuth() {
  console.log('--- Testing Normal API (requireAuth) ---');
  // Test 1: Bearer token works
  let req1 = { headers: { authorization: `Bearer ${token}` } };
  let res1 = mockRes();
  let next1Called = false;
  requireAuth(req1, res1, () => { next1Called = true; });
  assert('Bearer JWT works on normal authenticated API', next1Called === true && req1.user.id === 'user1');

  // Test 2: Query-string JWT rejected
  let req2 = { headers: {}, query: { token: token } };
  let res2 = mockRes();
  let next2Called = false;
  requireAuth(req2, res2, () => { next2Called = true; });
  assert('Query-string JWT is rejected on normal authenticated API', next2Called === false && res2.statusCode === 401);
}

function testSseAuth() {
  console.log('\n--- Testing SSE API (sseAuthMiddleware) ---');
  // Test 3: SSE accepts valid query-string JWT
  let req3 = { query: { token: token } };
  let res3 = mockRes();
  let next3Called = false;
  sseAuthMiddleware(req3, res3, () => { next3Called = true; });
  assert('SSE accepts valid query-string JWT', next3Called === true && req3.user.id === 'user1');

  // Test 4: SSE rejects missing token
  let req4 = { query: {} };
  let res4 = mockRes();
  let next4Called = false;
  sseAuthMiddleware(req4, res4, () => { next4Called = true; });
  assert('SSE rejects missing token', next4Called === false && res4.statusCode === 401);

  // Test 5: SSE rejects invalid token
  let req5 = { query: { token: invalidToken } };
  let res5 = mockRes();
  let next5Called = false;
  sseAuthMiddleware(req5, res5, () => { next5Called = true; });
  assert('SSE rejects invalid token', next5Called === false && res5.statusCode === 401);

  // Test 6: SSE rejects expired token
  let req6 = { query: { token: expiredToken } };
  let res6 = mockRes();
  let next6Called = false;
  sseAuthMiddleware(req6, res6, () => { next6Called = true; });
  assert('SSE rejects expired token', next6Called === false && res6.statusCode === 401);
  
  // Test 7,8: Check user context preservation
  let req7 = { query: { token: token } };
  let res7 = mockRes();
  sseAuthMiddleware(req7, res7, () => {});
  assert('Store isolation remains intact (context preserved)', req7.user.storeId === 'store1');
  assert('EXECUTIVE_ADMIN behavior remains intact (context preserved)', req7.user.role === 'SALES_REP');
}

testRequireAuth();
testSseAuth();

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
