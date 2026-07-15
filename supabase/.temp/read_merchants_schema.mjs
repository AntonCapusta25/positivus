import fs from 'fs';

const filePath = '/Users/alexandrfilippov/Desktop/hyperzod-dashboard/database/merchants-schema.sql';
try {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
} catch (err) {
  console.error(err);
}
