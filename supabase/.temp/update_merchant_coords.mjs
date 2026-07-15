const API_KEY = 'bVQYzhZTe5e-VwNERRikMOn_QkqNAFoUuyOwuhlQFkTQPj4fwVRx8JBNeQaEkToURWG6N2MP2A==';
const TENANT_ID = '8218';
const MERCHANT_ID = '6a0f03b4500ed5db150be1a1';

async function testUpdate(extraParams) {
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
    address: "Deurningerstraat 91B, 7514 BE Enschede, Netherlands",
    post_code: "7514BE",
    city: "Enschede",
    country_code: "NL",
    country: "Netherlands",
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
    ],
    ...extraParams
  };

  try {
    const res = await fetch(`https://api.hyperzod.app/admin/v1/merchant/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`Testing coords: ${JSON.stringify(extraParams)}:`);
    console.log(`Saved coordinates: ${JSON.stringify(data.data?.merchant_location?.coordinates)}, Address Location: ${JSON.stringify(data.data?.merchant_address_location)}`);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await testUpdate({ latitude: 52.2215372, longitude: 6.8936619 });
  await testUpdate({ lat: 52.2215372, lng: 6.8936619 });
  await testUpdate({ location_lat: 52.2215372, location_lon: 6.8936619 });
}
run();
