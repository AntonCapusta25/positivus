import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/doc_create_an_order.json', 'utf-8'));
const request = data.props?.pageProps?._doc?.data?.nodes?.[0]?.data?.request;
console.log('Create Order request details:');
console.log(JSON.stringify(request, null, 2));
