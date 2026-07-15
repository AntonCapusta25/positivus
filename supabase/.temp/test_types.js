const fs = require('fs');

async function testTypes() {
  const apiKey = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
  const tenantId = '8218';
  const url = 'https://api.hyperzod.app/store/v1/cart';

  const candidates = [
    // Lowercase strings
    'delivery', 'pickup', 'takeaway', 'dine_in', 'dinein', 'take_away', 'takeout', 'drive_thru', 'drivethru', 'catering', 'reservation',
    // Uppercase strings
    'DELIVERY', 'PICKUP', 'TAKEAWAY', 'DINE_IN', 'DINEIN',
    // Titlecase strings
    'Delivery', 'Pickup', 'Takeaway', 'DineIn', 'Dine_In', 'TakeAway',
    // Delivery modes/providers
    'delivery_by_tenant', 'delivery_by_merchant', 'delivery_by_driver', 'self_pickup', 'custom', 'custom_1',
    'delivery-by-tenant', 'delivery-by-merchant', 'delivery-by-driver', 'self-pickup',
    // Integers and numeric strings
    1, 2, 3, 4, 5, 0, '1', '2', '3', '4', '5', '0',
    // Basic entities
    'tenant', 'merchant', 'store', 'customer', 'driver',
    // Shipping types
    'standard', 'express', 'instant', 'shipping', 'shipment'
  ];

  console.log(`Testing ${candidates.length} type candidates...`);

  for (const t of candidates) {
    const body = {
      merchant_id: '6a0f03b4500ed5db150be1a1',
      type: t,
      cart_items: [{
        merchant_id: '6a0f03b4500ed5db150be1a1',
        product_id: '6a0f253d60170f019101bf76',
        product_name: 'Tandoori Chicken Spring Rolls (2 pieces)',
        product_price: 4,
        quantity: 1
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'X-TENANT': tenantId,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const resText = await response.text();
      let resJson;
      try { resJson = JSON.parse(resText); } catch(e) {}

      if (resJson && resJson.success === true) {
        console.log(`\n🎉 SUCCESS! Type "${t}" passed! Response:`, JSON.stringify(resJson));
        return;
      } else if (resJson && resJson.data && resJson.data.type) {
        // Still invalid type
      } else {
        console.log(`\n❓ Interesting response for type "${t}":`, resText);
      }
    } catch (error) {
      console.error(`Error with type "${t}":`, error.message);
    }
  }

  console.log('Finished testing candidates. None passed.');
}

testTypes();
