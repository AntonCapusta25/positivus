const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

async function updateAddress(addressStr, cityStr, postCodeStr, countryStr, countryCode) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-TENANT': TENANT_ID,
    'X-API-KEY': API_KEY
  };

  const payload = {
    id: MERCHANT_ID,
    name: "Spoonful",
    slug: "raj-curry-house",
    phone: "+31623338547",
    email: "Surajpillay1@gmail.com",
    address: addressStr,
    post_code: postCodeStr,
    city: cityStr,
    country_code: countryCode,
    country: countryStr,
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
    console.log(`Address: "${addressStr}"`);
    console.log(`- Saved coordinates: ${JSON.stringify(data.data?.merchant_location?.coordinates)}`);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  console.log('Testing famous locations to trigger geocoding...');
  await updateAddress("1600 Amphitheatre Pkwy, Mountain View, CA 94043", "Mountain View", "94043", "United States", "US");
  await new Promise(r => setTimeout(r, 1000));
  await updateAddress("10 Downing St, London SW1A 2AA", "London", "SW1A 2AA", "United Kingdom", "GB");
  await new Promise(r => setTimeout(r, 1000));
  await updateAddress("Mahanagar, Lucknow, Uttar Pradesh, India", "Lucknow", "226006", "India", "IN");
}
run();
