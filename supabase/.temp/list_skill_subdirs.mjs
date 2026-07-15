import fs from 'fs';
import path from 'path';

const dirPath = '/Users/alexandrfilippov/Desktop/skill';

function walk(dir, depth = 0) {
  if (depth > 2) return [];
  let results = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push({ path: filePath, isDir: true });
      results = results.concat(walk(filePath, depth + 1));
    } else {
      results.push({ path: filePath, isDir: false });
    }
  });
  return results;
}

try {
  const list = walk(dirPath);
  console.log('Skill files recursive:');
  list.forEach(item => {
    console.log(`${item.isDir ? '[DIR]' : '[FILE]'} ${path.relative(dirPath, item.path)}`);
  });
} catch (err) {
  console.error(err);
}
