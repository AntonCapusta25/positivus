const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;

async function test(typeValue) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  const body = {
    merchant_id: MERCHANT_ID,
    user_id: USER_ID,
    type: typeValue,
    cart_items: [
      {
        merchant_id: MERCHANT_ID,
        product_id: "6a0f253d60170f019101bf76",
        product_name: "Tandoori Chicken Spring Rolls (2 pieces)",
        product_price: 4,
        quantity: 1
      }
    ]
  };

  const res = await fetch('https://api.hyperzod.app/store/v1/cart', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log(`Testing type = ${JSON.stringify(typeValue)}:`);
  console.log(JSON.stringify(data));
}

async function run() {
  await test("delivery");
  await test("pickup");
  await test(1);
  await test("1");
  await test("delivery_by_tenant");
  await test("custom_1");
}
run();
