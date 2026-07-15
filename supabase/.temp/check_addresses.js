const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const USER_ID = 575692;
const fs = require('fs');

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
    return { status: res.status, data };
  } catch (err) {
    return { error: err.message };
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
    return { status: res.status, data };
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  const storeResult = await checkStoreAddressList();
  const adminResult = await checkAdminAddressList();
  
  const output = JSON.stringify({ storeResult, adminResult }, null, 2);
  fs.writeFileSync('/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/address_responses.txt', output);
  console.log('Done writing responses.');
}
run();
