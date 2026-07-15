import fs from 'fs';

const data = fs.readFileSync('/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/doc_validate_cart.json', 'utf-8');
console.log('Includes "checksum"?', data.includes('checksum'));
const matches = data.match(/"name":\s*"[^"]*checksum[^"]*"/gi);
console.log('Matches:', matches);
