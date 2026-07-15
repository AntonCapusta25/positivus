import fs from 'fs';
const checkPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/scripts/check-merchants.js';
if (fs.existsSync(checkPath)) {
  console.log(fs.readFileSync(checkPath, 'utf-8'));
} else {
  console.log('check-merchants.js not found.');
}
