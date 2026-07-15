const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;
const ADDRESS_ID = '6a2c9e4568b3352f440a2593';

async function testGet(queryParams) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  const qs = new URLSearchParams(queryParams).toString();
  const url = `https://api.hyperzod.app/store/v1/cart?${qs}`;

  const res = await fetch(url, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  console.log(`GET query: ${qs}`);
  console.log(JSON.stringify(data));
  console.log('='.repeat(60));
}

async function run() {
  console.log('1. Testing GET without type');
  await testGet({ merchant_id: MERCHANT_ID, user_id: USER_ID });

  console.log('2. Testing GET with type=delivery');
  await testGet({ merchant_id: MERCHANT_ID, user_id: USER_ID, type: 'delivery' });

  console.log('3. Testing GET with type=delivery & address_id');
  await testGet({ merchant_id: MERCHANT_ID, user_id: USER_ID, type: 'delivery', delivery_address_id: ADDRESS_ID });
  await testGet({ merchant_id: MERCHANT_ID, user_id: USER_ID, type: 'delivery', address_id: ADDRESS_ID });

  console.log('4. Testing GET with type=delivery & coordinates');
  await testGet({ merchant_id: MERCHANT_ID, user_id: USER_ID, type: 'delivery', latitude: 52.2215372, longitude: 6.8936619 });
}
run();
