import fs from 'fs';

const specPath = '/Users/alexandrfilippov/.gemini/antigravity-ide/brain/3b6e7af3-4f14-41d8-9c5b-03ba242ea3cc/.system_generated/steps/1272/content.md';
const content = fs.readFileSync(specPath, 'utf8');

// Strip any markdown header frontmatter if needed, but it should be standard json after line 9.
const jsonStart = content.indexOf('{');
const jsonStr = content.substring(jsonStart);

try {
  const spec = JSON.parse(jsonStr);
  console.log("Hyperzod OpenAPI Paths:");
  for (const path of Object.keys(spec.paths)) {
    const methods = Object.keys(spec.paths[path]);
    for (const method of methods) {
      const details = spec.paths[path][method];
      console.log(`- ${method.toUpperCase()} ${path} (${details.summary || 'No Summary'})`);
    }
  }
} catch (e) {
  console.error("JSON parse failed:", e.message);
}
