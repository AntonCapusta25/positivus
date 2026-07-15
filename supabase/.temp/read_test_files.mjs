import fs from 'fs';

const file1 = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/test-create-override.js';
const file2 = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/test-merchants-api.js';

if (fs.existsSync(file1)) {
  console.log(`=== Content of ${file1} ===`);
  console.log(fs.readFileSync(file1, 'utf-8'));
}

if (fs.existsSync(file2)) {
  console.log(`=== Content of ${file2} ===`);
  console.log(fs.readFileSync(file2, 'utf-8'));
}
