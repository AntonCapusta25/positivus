import fs from 'fs';

const filePath = '/Users/alexandrfilippov/betterworks-homemade/supabase/functions/create-hyperzod-merchant/index.ts';
try {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
} catch (err) {
  console.error(err);
}
