const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const USER_ID = 575692;

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  const payload = {
    user_id: USER_ID,
    address_type: "home",
    address: "Null Island, Gulf of Guinea",
    building: "Base",
    country: "Atlantic Ocean",
    country_code: "AO",
    location_lat_lon: [0.0, 0.0]
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/admin/v1/address/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Address creation response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
