const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/admin/v1/merchant/list`, {
      headers
    });
    const data = await res.json();
    if (data.success && data.data && data.data.data) {
      const merchant = data.data.data.find(m => m._id === MERCHANT_ID);
      console.log('Merchant representation in Hyperzod:');
      console.log(JSON.stringify(merchant, null, 2));
    } else {
      console.error(data);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
