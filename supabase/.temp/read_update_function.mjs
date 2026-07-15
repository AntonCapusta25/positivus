import fs from 'fs';
import path from 'path';

const filePaths = [
  '/Users/alexandrfilippov/betterworks-homemade/supabase/functions/update-hyperzod-merchant/index.ts',
  '/Users/alexandrfilippov/homemadeonboarding-3/supabase/functions/update-hyperzod-merchant/index.ts',
  '/Users/alexandrfilippov/homemadeonboarding-4/supabase/functions/update-hyperzod-merchant/index.ts'
];

let read = false;
for (const filePath of filePaths) {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`=== Content from ${filePath} ===`);
      console.log(content);
      read = true;
      break;
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err.message);
    }
  }
}

if (!read) {
  console.log('None of the update-hyperzod-merchant files could be found/read.');
}
