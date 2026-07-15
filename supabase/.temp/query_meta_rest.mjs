import fs from 'fs';
import path from 'path';

const dirPath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/node_modules';

function searchInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchInDir(filePath);
    } else if (filePath.endsWith('.d.ts') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('cart') || content.includes('Cart')) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('type') && (line.includes('delivery') || line.includes('pickup') || line.includes('cart'))) {
            console.log(`${path.relative(dirPath, filePath)} L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

// Search under @hyperzod if exists, or entire node_modules for hyperzod packages
if (fs.existsSync(path.join(dirPath, '@hyperzod'))) {
  searchInDir(path.join(dirPath, '@hyperzod'));
} else {
  console.log('@hyperzod folder not found in node_modules');
}
