import fs from 'fs';

const envPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/.env';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const restUrl = `${url}/rest/v1/orders?select=order_type`;
  const response = await fetch(restUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  if (response.ok) {
    const data = await response.json();
    const types = [...new Set(data.map(o => o.order_type))];
    console.log('Unique order_types in DB:', types);
  } else {
    console.error(await response.text());
  }
}
run();
