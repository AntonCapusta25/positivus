import fs from 'fs';
import path from 'path';

const dirPath = '/Users/alexandrfilippov/Desktop/skill';

try {
  if (fs.existsSync(dirPath)) {
    const list = fs.readdirSync(dirPath);
    console.log('Skill files:');
    list.forEach(file => {
      console.log(file);
    });
  } else {
    console.log('Skill directory does not exist.');
  }
} catch (err) {
  console.error(err);
}
