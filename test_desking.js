const axios = require('axios');

async function testDesking() {
  try {
    const res = await axios.post('http://localhost:3001/api/v1/desking/calculate', {
      sellingPrice: 79900,
      downPayment: 15000,
      tradeAllowance: 12000,
      tradePayoff: 5000,
      termMonths: 60,
      apr: 5.99,
      docFee: 899,
      taxRatePercent: 6.0
    }, {
      // Mocking auth header for testing
      headers: { Authorization: `Bearer MOCK_TOKEN` }
    });
    
    console.log('Success:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testDesking();
