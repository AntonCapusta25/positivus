import fs from 'fs';
import path from 'path';

const topDir = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard';

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist.`);
    return;
  }
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    console.log(`${stat.isDirectory() ? '[DIR] ' : '[FILE]'} ${item}`);
  });
}
listFiles(topDir);
