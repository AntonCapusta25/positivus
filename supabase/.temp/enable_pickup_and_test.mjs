const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  // 1. Update merchant accepted_order_types
  console.log('1. Updating merchant to accept pickup and delivery...');
  const payload = {
    id: MERCHANT_ID,
    name: "Spoonful",
    slug: "raj-curry-house",
    phone: "+31623338547",
    email: "Surajpillay1@gmail.com",
    address: "Deurningerstraat 91B, 7514 BE Enschede, Netherlands",
    post_code: "7514BE",
    city: "Enschede",
    country_code: "NL",
    country: "Netherlands",
    delivery_by: "tenant",
    accepted_order_types: ["delivery", "pickup"],
    status: 1,
    tax_method: "exclusive",
    commission: {
      delivery: {
        order_type: "delivery",
        type: "percentage",
        percent_value: 15,
        calculate_on_status: 1
      },
      pickup: {
        order_type: "pickup",
        type: "percentage",
        percent_value: 15,
        calculate_on_status: 1
      },
      custom_1: {
        order_type: "custom_1",
        type: "percentage",
        percent_value: 15,
        calculate_on_status: 1
      }
    },
    language_translation: [
      {
        "key": "name",
        "locale": "en",
        "value": "Spoonful"
      }
    ]
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/admin/v1/merchant/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Update merchant response:', data.success);
    if (!data.success) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    // 2. Fetch merchant to verify
    console.log('\n2. Verifying merchant accepted order types...');
    const listRes = await fetch(`https://api.hyperzod.app/admin/v1/merchant/list`, { headers });
    const listData = await listRes.json();
    const merchant = listData.data?.data?.find(m => m._id === MERCHANT_ID);
    console.log('Merchant accepted order types now:', merchant?.accepted_order_types);

    // 3. Test cart creation with type "pickup"
    console.log('\n3. Creating cart with type "pickup"...');
    const cartBody = {
      cart_id: '6a2c9e4568b3352f440a2590',
      merchant_id: MERCHANT_ID,
      user_id: USER_ID,
      type: "pickup",
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
    console.log('Cart creation response:');
    console.log(JSON.stringify(cartData, null, 2));
    
  } catch (err) {
    console.error(err);
  }
}
run();
