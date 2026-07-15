const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;
const ADDRESS_ID = '6a2c9e4568b3352f440a2593';

async function test(extraBody) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  const body = {
    merchant_id: MERCHANT_ID,
    user_id: USER_ID,
    type: "delivery",
    cart_items: [
      {
        merchant_id: MERCHANT_ID,
        product_id: "6a0f253d60170f019101bf76",
        product_name: "Tandoori Chicken Spring Rolls (2 pieces)",
        product_price: 4,
        quantity: 1
      }
    ],
    ...extraBody
  };

  const res = await fetch('https://api.hyperzod.app/store/v1/cart', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.success || (data.data && !data.data.type)) {
    console.log(`🎉 SUCCESS with params: ${JSON.stringify(extraBody)}`);
    console.log(JSON.stringify(data));
    return true;
  }
  return false;
}

async function run() {
  const cases = [
    { user_address_id: ADDRESS_ID },
    { address: { id: ADDRESS_ID } },
    { address: { _id: ADDRESS_ID } },
    { address: "Deurningerstraat 91B, Enschede" },
    { lat: 52.2215372, lng: 6.8936619 },
    { lat: 52.2215372, lon: 6.8936619 },
    { location_id: ADDRESS_ID },
    { delivery_address: { id: ADDRESS_ID } }
  ];

  for (const c of cases) {
    const ok = await test(c);
    if (ok) break;
  }
  console.log('Done testing address structures.');
}
run();
