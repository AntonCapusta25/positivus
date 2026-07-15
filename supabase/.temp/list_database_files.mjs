import fs from 'fs';
import path from 'path';

const dirPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/database';

try {
  const list = fs.readdirSync(dirPath);
  console.log('Database files:');
  list.forEach(file => {
    console.log(file);
  });
} catch (err) {
  console.error(err);
}
