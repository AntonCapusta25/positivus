const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

async function testUpsert() {
  const url = `${SUPABASE_URL}/rest/v1/selected_coupons`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        email: "test_upsert@gmail.com",
        coupon_ids: ["coupon_1"],
        updated_at: new Date().toISOString()
      })
    });
    console.log("Status:", res.status);
    console.log("Response text:", await res.text());
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testUpsert();
