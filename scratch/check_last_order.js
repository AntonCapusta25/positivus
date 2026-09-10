const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

async function run() {
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=1`, { headers });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Raw Response:", text);
}

run();
