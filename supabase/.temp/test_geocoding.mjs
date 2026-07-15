const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

async function updateAddress(addressStr, cityStr, postCodeStr, countryStr) {
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
    country_code: "NL",
    country: countryStr,
    delivery_by: "tenant",
    accepted_order_types: ["delivery"],
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
    console.log(`Address: "${addressStr}" -> Coordinates: ${JSON.stringify(data.data?.merchant_location?.coordinates)}`);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await updateAddress("Amsterdam, Netherlands", "Amsterdam", "1012 JS", "Netherlands");
  await updateAddress("Dam Square, Amsterdam, Netherlands", "Amsterdam", "1012 JS", "Netherlands");
}
run();
