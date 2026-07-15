const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';
const USER_ID = 575692;
const ADDRESS_ID = '6a2c9e4568b3352f440a2593'; // Enschede address

async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    // 1. Fetch catalog products
    console.log('1. Fetching active products for Spoonful...');
    const pRes = await fetch(`https://api.hyperzod.app/merchant/v1/catalog/product/list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ merchant_id: MERCHANT_ID })
    });
    const pData = await pRes.json();
    if (!pData.success || !pData.data || !pData.data.data || pData.data.data.length === 0) {
      console.log('No products found in catalog for Spoonful:', JSON.stringify(pData));
      return;
    }
    
    const product = pData.data.data[0];
    console.log(`Found product: ${product.name} (${product._id}) - Price: ${product.product_pricing.price_sell}`);
    
    // 2. Try creating cart with type "delivery"
    console.log('\n2. Testing cart creation with type "delivery"...');
    const cartBodyDel = {
      cart_id: '6a2c9e4568b3352f440a2590',
      merchant_id: MERCHANT_ID,
      user_id: USER_ID,
      type: "delivery",
      address_id: ADDRESS_ID,
      user_location: [52.2215372, 6.8936619],
      cart_items: [
        {
          merchant_id: MERCHANT_ID,
          product_id: product._id,
          product_name: product.name,
          product_price: product.product_pricing.price_sell,
          quantity: 1
        }
      ]
    };
    
    const resDel = await fetch('https://api.hyperzod.app/store/v1/cart', {
      method: 'POST',
      headers,
      body: JSON.stringify(cartBodyDel)
    });
    const dataDel = await resDel.json();
    console.log('Delivery Cart Response:');
    console.log(JSON.stringify(dataDel, null, 2));

    // 3. Try creating cart with type "pickup"
    console.log('\n3. Testing cart creation with type "pickup"...');
    const cartBodyPick = {
      ...cartBodyDel,
      type: "pickup"
    };
    delete cartBodyPick.address_id;
    delete cartBodyPick.user_location;
    
    const resPick = await fetch('https://api.hyperzod.app/store/v1/cart', {
      method: 'POST',
      headers,
      body: JSON.stringify(cartBodyPick)
    });
    const dataPick = await resPick.json();
    console.log('Pickup Cart Response:');
    console.log(JSON.stringify(dataPick, null, 2));
    
  } catch (err) {
    console.error(err);
  }
}
run();
