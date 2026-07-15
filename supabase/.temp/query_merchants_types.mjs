import fs from 'fs';

const envPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/.env';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const restUrl = `${url}/rest/v1/merchants?select=name,accepted_order_types`;
  const response = await fetch(restUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  if (response.ok) {
    const data = await response.json();
    console.log('Merchant Accepted Order Types:');
    data.forEach(m => {
      console.log(`Merchant: ${m.name}, Accepted Types:`, m.accepted_order_types);
    });
  } else {
    console.error(await response.text());
  }
}
run();
