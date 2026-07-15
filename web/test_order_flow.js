import crypto from 'crypto';

const API_KEY = 'b5LztNPujIndMPYpsRhwuw07beiaFZxQ5L6Di9LEn4JfZHPzPvyFJ1xr7xls-UAzjcgg5g2GVw==';
const TENANT = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

const headers = {
  'X-API-KEY': API_KEY,
  'X-TENANT': TENANT,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

async function fetchProducts() {
  console.log('Fetching products catalog...');
  const url = `https://api.hyperzod.app/merchant/v1/catalog/product/list?merchant_id=${MERCHANT_ID}`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to fetch products: ' + JSON.stringify(data));
  }
  // Fallback parsed based on verified self-healing format
  const list = data.data?.data || data.data || [];
  if (list.length === 0) {
    throw new Error('No products found for this merchant.');
  }
  return list;
}

async function getOrCreateCustomer() {
  console.log('Listing customers...');
  const listUrl = 'https://api.hyperzod.app/admin/v1/auth/user/all';
  const listResponse = await fetch(listUrl, { headers });
  const listData = await listResponse.json();
  
  if (listData.success && listData.data?.data?.length > 0) {
    const customer = listData.data.data[0];
    console.log(`Using existing customer: ${customer.first_name} ${customer.last_name} (ID: ${customer.id})`);
    return customer.id;
  }

  console.log('No customers found. Creating a test customer...');
  const createUrl = 'https://api.hyperzod.app/admin/v1/auth/user/add';
  const customerPayload = {
    first_name: 'Test',
    last_name: 'POS User',
    email: 'pos_test@spoonful.com',
    country_code: 'US',
    mobile: '1234567890'
  };
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(customerPayload)
  });
  const createData = await createResponse.json();
  if (!createData.success) {
    throw new Error('Failed to create customer: ' + JSON.stringify(createData));
  }
  console.log(`Created test customer: ID ${createData.data.id}`);
  return createData.data.id;
}

async function createAddress(userId) {
  console.log(`Creating address for user ID ${userId}...`);
  const url = 'https://api.hyperzod.app/admin/v1/address/create';
  const addressPayload = {
    user_id: userId,
    address_type: 'home',
    location_lat_lon: [52.370216, 4.895168],
    address: '10 Test Street, Amsterdam, NL',
    building: '10',
    landmark: 'Central Station',
    city: 'Amsterdam',
    area: 'Center',
    country: 'Netherlands',
    country_code: 'NL'
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(addressPayload)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to create address: ' + JSON.stringify(data));
  }
  console.log(`Created address with ID ${data.data._id}`);
  return data.data._id;
}

async function updateCart(userId, product) {
  console.log(`Creating cart with product: ${product.name}...`);
  const url = 'https://api.hyperzod.app/store/v1/cart';
  const cartPayload = {
    user_id: userId,
    merchant_id: product.merchant_id || MERCHANT_ID,
    type: 'ecommerce',
    payment_mode_id: 3,
    cart_items: [
      {
        merchant_id: product.merchant_id || MERCHANT_ID,
        product_id: product._id,
        item_image_url: null,
        product_name: product.name,
        product_price: parseFloat(product.price || 0),
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
  if (!data.success) {
    throw new Error('Failed to update cart: ' + JSON.stringify(data));
  }
  const cartId = data.data.cart_id || data.data._id || data.data.id;
  console.log(`Cart updated successfully. Cart ID: ${cartId}, Checksum: ${data.data.checksum}`);
  return {
    cartId,
    checksum: data.data.checksum
  };
}

async function validateCart(userId, cartId, addressId) {
  console.log(`Validating cart ${cartId}...`);
  const params = new URLSearchParams({
    user_id: userId,
    cart_id: cartId,
    order_type: 'pickup',
    address_id: addressId,
    delivery_location: '52.370216,4.895168',
    payment_mode_id: '3'
  });
  const url = `https://api.hyperzod.app/store/v1/cart/validate?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to validate cart: ' + JSON.stringify(data));
  }
  console.log(`Cart validated successfully. Returned Checksum: ${data.data.checksum}`);
  return data.data.checksum;
}

async function placeOrder(userId, addressId, cartId, checksum) {
  console.log('Placing order on Hyperzod...');
  const url = 'https://api.hyperzod.app/admin/v1/order/create';
  const orderPayload = {
    user_id: userId,
    merchant_id: MERCHANT_ID,
    address_id: addressId,
    delivery_address_id: addressId,
    cart_id: cartId,
    payment_mode_id: 3, // COD
    order_type: 'pickup',
    order_comment: 'Automated test order from Spoonful POS script',
    checksum: checksum,
    scheduling_slot: {
      is_scheduled: false
    }
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderPayload)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to place order: ' + JSON.stringify(data));
  }
  console.log('ORDER PLACED SUCCESSFULLY ON HYPERZOD!');
  console.log('Order Details:', JSON.stringify(data.data, null, 2));
  return data.data;
}

async function run() {
  try {
    const products = await fetchProducts();
    const product = products[0];
    console.log(`Selected product: ${product.name} (ID: ${product._id}, Price: ${product.price})`);

    const userId = await getOrCreateCustomer();
    const addressId = await createAddress(userId);
    const { cartId } = await updateCart(userId, product);
    const checksum = await validateCart(userId, cartId, addressId);
    const order = await placeOrder(userId, addressId, cartId, checksum);
    
    console.log('\nSuccess! Order ID:', order.order_id || order._id || order.id);
  } catch (e) {
    console.error('\nError running flow:', e.message);
  }
}

run();
