import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/doc_update_a_merchant.json', 'utf-8'));
const schema = data.props?.pageProps?._doc?.data?.nodes?.[0]?.data?.request?.bodyDataParameters?.[0]?.schema;
console.log('Update Merchant schema fields:');
console.log(schema ? schema.map(s => `${s.name} (${s.type}, kind: ${s.kind})`) : 'Not found');
