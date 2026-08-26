const fs = require('fs');
const content = fs.readFileSync('store_index.js', 'utf8');

const idx = 428817;
const body = content.slice(idx, idx + 2500);
console.log(body);
