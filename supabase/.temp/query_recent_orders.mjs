import fs from 'fs';

const envPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/.env';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const restUrl = `${url}/rest/v1/orders?select=order_id,order_type,meta&order=created_timestamp.desc&limit=10`;
  const response = await fetch(restUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  if (response.ok) {
    const data = await response.json();
    console.log('Recent Orders (last 10):');
    data.forEach((o, i) => {
      console.log(`Order ${o.order_id}: Type = ${o.order_type}, Meta is null? ${o.meta === null}, Meta length: ${Array.isArray(o.meta) ? o.meta.length : typeof o.meta}`);
      if (o.meta && (Array.isArray(o.meta) ? o.meta.length > 0 : Object.keys(o.meta).length > 0)) {
        console.log(JSON.stringify(o.meta, null, 2));
      }
    });
  } else {
    console.error(await response.text());
  }
}
run();
