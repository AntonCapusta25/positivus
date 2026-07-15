import fs from 'fs';
import path from 'path';

const transcriptPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/brain/799465e2-8bb7-4957-9d69-dd89abe597fe/.system_generated/logs/transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('public-breadcrumbs-wrapper') || line.includes('open-api-content-wrapper') || line.includes('open-api-header-url-input')) {
        console.log(`Line ${idx + 1} contains snippet.`);
        // Let's print the line contents (or part of it)
        const obj = JSON.parse(line);
        console.log('Source:', obj.source);
        console.log('Type:', obj.type);
        const text = obj.content || '';
        console.log('Content length:', text.length);
        
        // Search for "type" validation or options in text
        if (text.includes('type') && (text.includes('delivery') || text.includes('pickup'))) {
          // Let's extract occurrences of type parameters/descriptions
          const matches = [];
          let index = 0;
          while (true) {
            index = text.indexOf('type', index);
            if (index === -1) break;
            matches.push(text.substring(Math.max(0, index - 200), Math.min(text.length, index + 300)));
            index += 4;
            if (matches.length > 20) break;
          }
          console.log(`Found ${matches.length} snippets near "type":`);
          matches.forEach((m, mIdx) => {
            console.log(`--- Match ${mIdx + 1} ---`);
            console.log(m.replace(/\s+/g, ' '));
          });
        }
      }
    });
  } catch (err) {
    console.error('Error reading transcript:', err.message);
  }
} else {
  console.log('Transcript file does not exist.');
}
