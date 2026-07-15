import fs from 'fs';
const pkg = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/package.json';
if (fs.existsSync(pkg)) {
  console.log(fs.readFileSync(pkg, 'utf-8'));
} else {
  console.log('package.json not found.');
}
