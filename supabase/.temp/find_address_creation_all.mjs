import fs from 'fs';
import path from 'path';

const transcriptPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/brain/799465e2-8bb7-4957-9d69-dd89abe597fe/.system_generated/logs/transcript.jsonl';
const outputPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/address_creation_steps.txt';

if (fs.existsSync(transcriptPath)) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');
    let out = '';
    
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      if (line.includes('6a2c9e4568b3352f440a2593') || (line.includes('address') && line.includes('create'))) {
        out += `=== Match at Line ${idx + 1} ===\n`;
        out += line + '\n\n';
      }
    });
    
    fs.writeFileSync(outputPath, out);
    console.log('Written to:', outputPath);
  } catch (err) {
    console.error('Error:', err.message);
  }
} else {
  console.log('Transcript not found.');
}
