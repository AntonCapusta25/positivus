const API_KEY = 'b5LztNPujIndMPYpsRhwuw07beiaFZxQ5L6Di9LEn4JfZHPzPvyFJ1xr7xls-UAzjcgg5g2GVw==';
const TENANT = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

const headers = {
  'X-API-KEY': API_KEY,
  'X-TENANT': TENANT,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

async function testCartPaymentInUpdate() {
  const url = 'https://api.hyperzod.app/store/v1/cart';
  const cartPayload = {
    user_id: 575692,
    merchant_id: MERCHANT_ID,
    type: 'ecommerce',
    payment_mode_id: 3,
    cart_items: [
      {
        merchant_id: MERCHANT_ID,
        product_id: '6a0f254860170f019101bf99',
        item_image_url: null,
        product_name: 'Sprite Zero Sugar 330ml',
        product_price: 2.5,
        quantity: 1,
        product_options: []
      }
    ]
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(cartPayload)
  });
  const data = await response.json();
  console.log(`Cart Update with payment_mode_id => Status: ${response.status}, success: ${data.success}, message: ${data.message}`);
}

async function testCartPaymentInValidate() {
  const params = new URLSearchParams({
    user_id: '575692',
    cart_id: '6a5257ebe955f5ef0d01a8e0',
    order_type: 'pickup',
    address_id: '6a5257eb53cb47acf80b62b3',
    delivery_location: '52.370216,4.895168',
    payment_mode_id: '3'
  });
  const url = `https://api.hyperzod.app/store/v1/cart/validate?${params.toString()}`;
  const response = await fetch(url, { method: 'GET', headers });
  const data = await response.json();
  console.log(`Cart Validate with payment_mode_id => Status: ${response.status}, success: ${data.success}, message: ${data.message}`);
}

async function run() {
  await testCartPaymentInUpdate();
  await testCartPaymentInValidate();
}

run();
