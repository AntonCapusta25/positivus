const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

async function testGetQuery() {
  console.log('Testing GET with query parameter...');
  const headers = {
    'Accept': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };
  try {
    const res = await fetch(`https://api.hyperzod.app/merchant/v1/catalog/product/list?merchant_id=${MERCHANT_ID}`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    console.log('Query Response Status:', res.status, data.success);
    if (data.success && data.data?.data) {
      console.log(`Found ${data.data.data.length} products!`);
      data.data.data.forEach(p => console.log(`- ${p.name} (${p._id})`));
    } else {
      console.log(JSON.stringify(data).slice(0, 500));
    }
  } catch (err) {
    console.error(err);
  }
}

async function testGetBody() {
  console.log('\nTesting GET with body...');
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };
  try {
    const res = await fetch(`https://api.hyperzod.app/merchant/v1/catalog/product/list`, {
      method: 'GET',
      headers,
      body: JSON.stringify({ merchant_id: MERCHANT_ID })
    });
    const data = await res.json();
    console.log('Body Response Status:', res.status, data.success);
    if (data.success && data.data?.data) {
      console.log(`Found ${data.data.data.length} products!`);
      data.data.data.forEach(p => console.log(`- ${p.name} (${p._id})`));
    } else {
      console.log(JSON.stringify(data).slice(0, 500));
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await testGetQuery();
  await testGetBody();
}
run();
