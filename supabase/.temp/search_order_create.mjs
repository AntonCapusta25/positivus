import fs from 'fs';
import path from 'path';

const dirs = [
  '/Users/alexandrfilippov/betterworks-homemade',
  '/Users/alexandrfilippov/Homemade-Onboarding',
  '/Users/alexandrfilippov/Desktop/hyperzod-dashboard'
];

function searchInDir(dir) {
  if (!fs.existsSync(dir)) return;
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch {
    return;
  }
  list.forEach(file => {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        searchInDir(filePath);
      }
    } else if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.json') || filePath.endsWith('.md')) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('order/create')) {
          console.log(`=== Match in ${filePath} ===`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('order/create')) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
            }
          });
        }
      } catch {}
    }
  });
}

dirs.forEach(dir => searchInDir(dir));
console.log('Done searching.');
