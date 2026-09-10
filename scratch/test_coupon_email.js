const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

async function testSend() {
  const url = `${SUPABASE_URL}/functions/v1/send-coupon-email`;
  const body = {
    orderNumber: "TEST-777",
    customerEmail: "info@autoflowstudio.net",
    couponTitles: [
      "🎁 Free Mango Lassi",
      "✨ 15% Discount on next purchase"
    ]
  };

  console.log("Sending test coupon email payload:", JSON.stringify(body, null, 2));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(body)
    });

    console.log("Response status:", res.status);
    const json = await res.json();
    console.log("Response JSON:", json);
  } catch (err) {
    console.error("Test send error:", err);
  }
}

testSend();
