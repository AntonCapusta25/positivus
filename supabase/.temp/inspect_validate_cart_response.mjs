import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/supabase/.temp/doc_validate_cart.json', 'utf-8'));
const responses = data.props?.pageProps?._doc?.data?.nodes?.[0]?.data?.responses;
console.log('Validate Cart response details:');
console.log(JSON.stringify(responses, null, 2));
