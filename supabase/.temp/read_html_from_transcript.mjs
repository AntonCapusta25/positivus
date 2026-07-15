import fs from 'fs';
import path from 'path';

const transcriptPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/brain/799465e2-8bb7-4957-9d69-dd89abe597fe/.system_generated/logs/transcript.jsonl';
const outputPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/extracted_matches.txt';

if (fs.existsSync(transcriptPath)) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');
    let out = '';
    
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      const obj = JSON.parse(line);
      if (obj.source === 'USER_EXPLICIT' && obj.type === 'USER_INPUT') {
        const text = obj.content || '';
        if (text.includes('public-breadcrumbs') || text.includes('open-api-content') || text.includes('api.hyperzod.app')) {
          out += `=== Step ${obj.step_index || idx}: Length ${text.length} ===\n`;
          
          let startIdx = 0;
          while (true) {
            const typeIdx = text.indexOf('type', startIdx);
            if (typeIdx === -1) break;
            
            const snippet = text.substring(Math.max(0, typeIdx - 150), Math.min(text.length, typeIdx + 250));
            out += `Near 'type': ...${snippet.replace(/\s+/g, ' ')}...\n`;
            out += '-'.repeat(40) + '\n';
            startIdx = typeIdx + 4;
            if (startIdx > text.length - 10) break;
          }
        }
      }
    });
    
    fs.writeFileSync(outputPath, out);
    console.log('Matches written to:', outputPath);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
