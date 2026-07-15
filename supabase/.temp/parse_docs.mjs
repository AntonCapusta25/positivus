import fs from 'fs';

function parseDoc(name) {
  const filePath = `/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/doc_${name}.json`;
  if (!fs.existsSync(filePath)) {
    console.log(`File for ${name} not found.`);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const doc = data.props?.pageProps?._doc;
  if (!doc) {
    console.log(`No _doc found for ${name}`);
    return;
  }
  
  console.log('='.repeat(60));
  console.log(`DOCUMENT: ${doc.name} (${name})`);
  console.log('Title:', doc.title);
  console.log('Summary:', doc.summary);
  
  // Traverse doc.data to find blocks or text
  if (doc.data && doc.data.blocks) {
    console.log('Blocks structure:');
    doc.data.blocks.forEach((block, idx) => {
      if (block.type === 'text' || block.type === 'paragraph' || block.type === 'heading') {
        const text = block.data?.text || block.data?.html || '';
        console.log(`[${block.type}]: ${text.replace(/<[^>]*>/g, '')}`);
      } else if (block.type === 'openapi' || block.type === 'api' || block.type === 'code') {
        console.log(`[${block.type}]:`, JSON.stringify(block.data, null, 2));
      } else if (block.type === 'list') {
        console.log(`[list]:`, block.data?.items);
      } else {
        console.log(`[${block.type}]:`, Object.keys(block.data || {}));
        if (block.data && block.data.embedCode) {
          console.log('Embed Code:', block.data.embedCode);
        }
        // Let's print the whole block data if it's small or we want to inspect
        if (JSON.stringify(block.data).length < 2000) {
          console.log('Block Data:', JSON.stringify(block.data, null, 2));
        }
      }
    });
  } else {
    console.log('doc.data structure is different:', Object.keys(doc.data || {}));
    console.log(JSON.stringify(doc.data, null, 2).slice(0, 2000));
  }
}

const args = process.argv.slice(2);
if (args.length > 0) {
  parseDoc(args[0]);
} else {
  // Parse all
  const names = ['update_cart', 'validate_cart', 'create_an_order', 'update_a_merchant', 'fetch_address'];
  names.forEach(parseDoc);
}
