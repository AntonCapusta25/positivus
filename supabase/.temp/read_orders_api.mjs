import fs from 'fs';

const ordersApi = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/src/modules/marketing/api/orders.ts';
const apiTs = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/src/api.ts';

if (fs.existsSync(ordersApi)) {
  console.log(`=== Content of ${ordersApi} ===`);
  console.log(fs.readFileSync(ordersApi, 'utf-8'));
}

if (fs.existsSync(apiTs)) {
  console.log(`=== Content of ${apiTs} ===`);
  console.log(fs.readFileSync(apiTs, 'utf-8'));
}
