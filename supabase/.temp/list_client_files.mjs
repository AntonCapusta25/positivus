import fs from 'fs';
import path from 'path';

const clientSrc = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/client/src';

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist.`);
    return;
  }
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      console.log(`[DIR]  ${path.relative(clientSrc, full)}`);
      listFiles(full);
    } else {
      console.log(`[FILE] ${path.relative(clientSrc, full)}`);
    }
  });
}
listFiles(clientSrc);
