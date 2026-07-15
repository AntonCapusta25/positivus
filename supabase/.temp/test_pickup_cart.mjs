const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';

// We will find a merchant that accepts pickup and has products
async function run() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  try {
    // 1. Fetch merchants to find one accepting pickup
    const mRes = await fetch(`https://api.hyperzod.app/admin/v1/merchant/list`, { headers });
    const mData = await mRes.json();
    const pickupMerchant = mData.data.data.find(m => m.accepted_order_types.includes('pickup'));
    if (!pickupMerchant) {
      console.log('No pickup merchant found.');
      return;
    }
    console.log(`Found pickup merchant: ${pickupMerchant.name} (${pickupMerchant._id})`);

    // 2. Fetch products for this merchant
    const pRes = await fetch(`https://api.hyperzod.app/merchant/v1/catalog/product/list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ merchant_id: pickupMerchant._id })
    });
    const pData = await pRes.json();
    if (!pData.success || !pData.data || pData.data.data.length === 0) {
      console.log(`No products found for merchant ${pickupMerchant.name}`);
      return;
    }
    const product = pData.data.data[0];
    console.log(`Found product: ${product.name} (${product._id}) with price ${product.product_pricing.price_sell}`);

    // 3. Test creating a cart with type "pickup"
    const cartRes = await fetch('https://api.hyperzod.app/store/v1/cart', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        merchant_id: pickupMerchant._id,
        user_id: 575692,
        type: 'pickup',
        cart_items: [
          {
            merchant_id: pickupMerchant._id,
            product_id: product._id,
            product_name: product.name,
            product_price: product.product_pricing.price_sell,
            quantity: 1
          }
        ]
      })
    });
    const cartData = await cartRes.json();
    console.log('Cart creation response for pickup:');
    console.log(JSON.stringify(cartData, null, 2));

    // 4. Test creating a cart with type "delivery" for this merchant
    const cartDelRes = await fetch('https://api.hyperzod.app/store/v1/cart', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        merchant_id: pickupMerchant._id,
        user_id: 575692,
        type: 'delivery',
        cart_items: [
          {
            merchant_id: pickupMerchant._id,
            product_id: product._id,
            product_name: product.name,
            product_price: product.product_pricing.price_sell,
            quantity: 1
          }
        ]
      })
    });
    const cartDelData = await cartDelRes.json();
    console.log('Cart creation response for delivery:');
    console.log(JSON.stringify(cartDelData, null, 2));

  } catch (err) {
    console.error(err);
  }
}
run();
