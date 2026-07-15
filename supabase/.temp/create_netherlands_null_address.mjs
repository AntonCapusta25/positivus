const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const USER_ID = 575692;
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

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
    address: "Dam Square, Amsterdam, Netherlands",
    building: "Dam",
    city: "Amsterdam",
    country: "Netherlands",
    country_code: "NL",
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
    
    if (data.success && data.data?._id) {
      const addressId = data.data._id;
      console.log(`Created address ID: ${addressId}. Now testing cart creation...`);
      
      const cartBody = {
        cart_id: '6a2c9e4568b3352f440a2590',
        merchant_id: MERCHANT_ID,
        user_id: USER_ID,
        type: "delivery",
        address_id: addressId,
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
      
      const cartRes = await fetch('https://api.hyperzod.app/store/v1/cart', {
        method: 'POST',
        headers,
        body: JSON.stringify(cartBody)
      });
      const cartData = await cartRes.json();
      console.log('Cart update response with matching NL Null Island address:');
      console.log(JSON.stringify(cartData, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}
run();
