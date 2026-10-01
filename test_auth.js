const axios = require('axios');

async function testAuth() {
  try {
    const res = await axios.post('http://localhost:3001/api/v1/auth/quick-demo', {
      roleId: 'LIAISON'
    });
    console.log('Success:', res.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAuth();
