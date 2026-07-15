import fs from 'fs';
import path from 'path';

const scriptsDir = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/scripts';
if (fs.existsSync(scriptsDir)) {
  fs.readdirSync(scriptsDir).forEach(file => {
    console.log(file);
  });
} else {
  console.log('Scripts dir not found.');
}
