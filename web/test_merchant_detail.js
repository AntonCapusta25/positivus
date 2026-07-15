const API_KEY = 'b5LztNPujIndMPYpsRhwuw07beiaFZxQ5L6Di9LEn4JfZHPzPvyFJ1xr7xls-UAzjcgg5g2GVw==';
const TENANT = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

const headers = {
  'X-API-KEY': API_KEY,
  'X-TENANT': TENANT,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

async function run() {
  const url = 'https://api.hyperzod.app/admin/v1/merchant/list';
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    if (data.success) {
      const merchant = data.data.data.find(m => m.merchant_id === MERCHANT_ID || m._id === MERCHANT_ID);
      console.log('Merchant details:', JSON.stringify(merchant, null, 2));
    } else {
      console.log('Failed:', data);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
