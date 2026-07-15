async function run() {
  const headers = {
    'X-API-KEY': 'b5LztNPujIndMPYpsRhwuw07beiaFZxQ5L6Di9LEn4JfZHPzPvyFJ1xr7xls-UAzjcgg5g2GVw==',
    'X-TENANT': '8218',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const endpoints = [
    'https://api.hyperzod.app/admin/v1/customer',
    'https://api.hyperzod.app/admin/v1/customer/list',
    'https://api.hyperzod.app/admin/v1/customer/all',
    'https://api.hyperzod.app/admin/v1/customer/list-all'
  ];

  for (const url of endpoints) {
    try {
      console.log(`Trying GET ${url}...`);
      const response = await fetch(url, { headers });
      console.log(`Status: ${response.status}`);
      if (response.status === 200) {
        const data = await response.json();
        console.log(`Success on ${url}! Data keys:`, Object.keys(data));
        if (data.data) {
          console.log(`Data count/type:`, Array.isArray(data.data) ? data.data.length : typeof data.data);
          if (Array.isArray(data.data) && data.data.length > 0) {
            console.log(`First item sample:`, JSON.stringify(data.data[0], null, 2));
            break;
          } else {
            console.log(`Data sample:`, JSON.stringify(data.data, null, 2));
          }
        }
      } else {
        const text = await response.text();
        console.log(`Response text:`, text.substring(0, 200));
      }
    } catch (e) {
      console.error(`Error fetching ${url}:`, e.message);
    }
  }
}

run();
