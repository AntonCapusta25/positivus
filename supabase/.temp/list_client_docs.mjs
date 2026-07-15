import fs from 'fs';

const content = fs.readFileSync('/Users/alexandrfilippov/.gemini/antigravity-ide/brain/799465e2-8bb7-4957-9d69-dd89abe597fe/.system_generated/steps/1384/content.md', 'utf-8');

const scriptTag = content.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

if (scriptTag) {
  try {
    const data = JSON.parse(scriptTag[1]);
    const request = data.props?.pageProps?._doc?.data?.nodes?.[0]?.data?.request;
    const method = data.props?.pageProps?._doc?.data?.nodes?.[0]?.data?.method;
    const url = data.props?.pageProps?._doc?.data?.nodes?.[0]?.data?.url;
    console.log('Method:', method);
    console.log('URL:', url);
    console.log('Request details:', JSON.stringify(request, null, 2));
  } catch (err) {
    console.error('Failed to parse JSON:', err.message);
  }
} else {
  console.log('Could not find __NEXT_DATA__ script tag.');
}
