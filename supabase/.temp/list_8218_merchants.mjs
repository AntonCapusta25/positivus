const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/admin/v1/merchant/list`, { headers });
    const data = await res.json();
    if (data.success && data.data && data.data.data) {
      console.log(`Found ${data.data.data.length} merchants:`);
      data.data.data.forEach(m => {
        console.log(`Merchant: ${m.name} (${m._id}), Status: ${m.status}, Accepted Types:`, m.accepted_order_types);
      });
    } else {
      console.error(data);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
