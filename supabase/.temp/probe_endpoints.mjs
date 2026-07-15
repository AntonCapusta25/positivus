const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';

async function check(url, isAdmin = false) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(`URL: ${url} (Admin: ${isAdmin}) - Status: ${res.status}`);
    if (res.ok && data.success) {
      console.log(JSON.stringify(data.data || data, null, 2).slice(0, 1000));
    } else {
      console.log(`Failed or not success:`, data.message || data);
    }
  } catch (err) {
    console.error(`Error for ${url}:`, err.message);
  }
}

async function run() {
  const storeUrls = [
    'https://api.hyperzod.app/store/v1/settings',
    'https://api.hyperzod.app/store/v1/config',
    'https://api.hyperzod.app/store/v1/tenant/settings',
    'https://api.hyperzod.app/store/v1/tenant/config'
  ];

  const adminUrls = [
    'https://api.hyperzod.app/admin/v1/settings',
    'https://api.hyperzod.app/admin/v1/config',
    'https://api.hyperzod.app/admin/v1/tenant/settings',
    'https://api.hyperzod.app/admin/v1/tenant/config'
  ];

  for (const url of storeUrls) {
    await check(url, false);
  }
  for (const url of adminUrls) {
    await check(url, true);
  }
}
run();
