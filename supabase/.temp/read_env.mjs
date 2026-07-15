import fs from 'fs';
const envPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/.env';
if (fs.existsSync(envPath)) {
  console.log(fs.readFileSync(envPath, 'utf-8'));
} else {
  console.log('Env not found.');
}
