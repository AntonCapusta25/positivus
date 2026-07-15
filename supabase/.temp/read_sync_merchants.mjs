import fs from 'fs';
const syncPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/scripts/sync-merchants.js';
if (fs.existsSync(syncPath)) {
  console.log(fs.readFileSync(syncPath, 'utf-8'));
} else {
  console.log('sync-merchants.js not found.');
}
