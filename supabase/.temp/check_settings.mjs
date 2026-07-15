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
    // 1. Fetch merchant details
    console.log('Fetching merchant details...');
    const mRes = await fetch(`https://api.hyperzod.app/store/v1/merchant/detail?merchant_id=${MERCHANT_ID}`, {
      headers
    });
    const mData = await mRes.json();
    console.log('Merchant details status:', mData.success);
    if (mData.success) {
      console.log('Order types / settings in merchant:', JSON.stringify(mData.data?.delivery_types || mData.data?.order_types || mData.data?.settings || mData.data, null, 2));
    } else {
      console.error(mData);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
