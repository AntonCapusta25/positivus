import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/.env';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const s = createClient(url, key);
async function run() {
  const { data, error } = await s.from('orders').select('meta').limit(3);
  if (error) {
    console.error(error);
  } else {
    data.forEach((o, i) => {
      console.log(`Order ${i + 1} Meta:`);
      console.log(JSON.stringify(o.meta, null, 2));
    });
  }
}
run();
