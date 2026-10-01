const axios = require('axios');

async function testMarketplace() {
  try {
    const listingsRes = await axios.get('http://localhost:3001/api/v1/marketplace/listings?location=Fort Lauderdale');
    console.log('Listings Response:', JSON.stringify(listingsRes.data, null, 2));

    const inventoryRes = await axios.get('http://localhost:3001/api/v1/dealers/auto-money-fl/inventory');
    console.log('Inventory Response:', JSON.stringify(inventoryRes.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testMarketplace();
