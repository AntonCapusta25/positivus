const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;
const CART_ID = '6a2c9e4568b3352f440a2590';
const ADDRESS_ID = '6a2ca82f5481a25b4c0e353f'; // Null Island address

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  const body = {
    cart_id: CART_ID,
    merchant_id: MERCHANT_ID,
    user_id: USER_ID,
    type: "delivery",
    address_id: ADDRESS_ID,
    user_location: [0.0, 0.0],
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

  try {
    const res = await fetch('https://api.hyperzod.app/store/v1/cart', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('Cart update response with Null Island address:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
