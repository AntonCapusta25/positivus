import fs from 'fs';
import path from 'path';

const files = [
  '/Users/alexandrfilippov/Desktop/skill/Script expert/SKILL.md',
  '/Users/alexandrfilippov/Desktop/skill/homemade_events_final.md',
  '/Users/alexandrfilippov/Desktop/skill/menuhz/SKILL.md',
  '/Users/alexandrfilippov/Desktop/skill/skill 3/SKILL.md',
  '/Users/alexandrfilippov/Desktop/skill/skill 3/skill 2/SKILL.md',
  '/Users/alexandrfilippov/Desktop/skill/veo3 /SKILL.md'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.toLowerCase().includes('cart') || content.toLowerCase().includes('order')) {
        console.log(`=== Matches in ${filePath} ===`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (
            line.toLowerCase().includes('cart') || 
            line.toLowerCase().includes('order') || 
            line.toLowerCase().includes('v1/')
          ) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err.message);
    }
  }
});
