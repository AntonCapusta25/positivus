import fs from 'fs';
import path from 'path';

const transcriptPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/brain/799465e2-8bb7-4957-9d69-dd89abe597fe/.system_generated/logs/transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      if (line.includes('6a2c9e4568b3352f440a2593') || line.includes('address') && line.includes('create')) {
        const obj = JSON.parse(line);
        console.log(`Step ${obj.step_index || idx}: Source ${obj.source}`);
        if (obj.tool_calls) {
          console.log('Tool calls:', JSON.stringify(obj.tool_calls, null, 2));
        } else if (line.includes('6a2c9e4568b3352f440a2593')) {
          console.log('Output preview:', line.substring(0, 1000));
        }
      }
    });
  } catch (err) {
    console.error(err.message);
  }
}
