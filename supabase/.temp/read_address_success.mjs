import fs from 'fs';

const transcriptPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/brain/799465e2-8bb7-4957-9d69-dd89abe597fe/.system_generated/logs/transcript.jsonl';
const outputPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/address_success_line.txt';

if (fs.existsSync(transcriptPath)) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');
    let out = '';
    
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (line.includes('6a2c9e4568b3352f440a2593')) {
        const obj = JSON.parse(line);
        if (obj.source === 'SYSTEM' || obj.source === 'MODEL') {
          out += `=== Match at Line ${idx + 1} (Step ${obj.step_index}) ===\n`;
          out += JSON.stringify(obj, null, 2) + '\n\n';
        }
      }
    }
    
    fs.writeFileSync(outputPath, out);
    console.log('Written successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
