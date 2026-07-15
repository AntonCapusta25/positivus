const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/store/v1/cart?user_id=${USER_ID}&merchant_id=${MERCHANT_ID}`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    console.log('GET Cart Response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
