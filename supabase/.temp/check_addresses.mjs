const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const USER_ID = 575692;

async function checkStoreAddressList() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/store/v1/address/list?user_id=${USER_ID}`, { headers });
    const data = await res.json();
    console.log('GET store address list:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

async function checkAdminAddressList() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/admin/v1/address/list?user_id=${USER_ID}`, { headers });
    const data = await res.json();
    console.log('GET admin address list:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await checkStoreAddressList();
  await checkAdminAddressList();
}
run();
