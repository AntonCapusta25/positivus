import fs from 'fs';
import path from 'path';

const docIds = {
  'update_cart': 'PREVIEW-xK_ssjD801ElrUP9Vt_Af',
  'validate_cart': 'PREVIEW-UzQ9tcHn9tB_PuR79CIXp',
  'create_an_order': 'PREVIEW-jvGMncaJgUffXZAiP-JrL',
  'update_a_merchant': 'PREVIEW-cO5P1NNydE189mQtPIsSl',
  'fetch_address': 'PREVIEW-jz1N_H9B8YfTljOQQk3fU'
};

async function download(name, id) {
  const url = `https://app.archbee.com/public/PREVIEW-TSX59B-ftH01Uoa0aU550/${id}`;
  console.log(`Downloading ${name} (${id}) from ${url}...`);
  try {
    const res = await fetch(url);
    const html = await res.text();
    
    // Extract __NEXT_DATA__
    const scriptTag = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (scriptTag) {
      const data = JSON.parse(scriptTag[1]);
      const outPath = `/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/doc_${name}.json`;
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`Saved JSON for ${name} to ${outPath}`);
    } else {
      console.log(`Could not find __NEXT_DATA__ for ${name}`);
    }
  } catch (err) {
    console.error(`Error downloading ${name}:`, err.message);
  }
}

async function run() {
  for (const [name, id] of Object.entries(docIds)) {
    await download(name, id);
    // Pause briefly to be polite
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('Batch download completed.');
}
run();
