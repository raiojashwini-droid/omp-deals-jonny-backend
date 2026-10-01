const axios = require('axios');

async function testLeads() {
  try {
    const res = await axios.post('http://localhost:3001/api/v1/leads/intent', {
      vehicleId: null, // Just passing null for test if DB empty
      dealerId: 'auto-money-fl',
      customerName: 'Test Buyer',
      phone: '(954) 555-1234',
      buyingTimeline: 'NOW or within 24 hours',
      phoneConsent: true,
      sourceRef: 'AMP-TEST',
      dwellDurationSeconds: 12
    });
    console.log('Success:', res.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testLeads();
