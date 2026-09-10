const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

async function run() {
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
  
  const resSel = await fetch(`${SUPABASE_URL}/rest/v1/selected_coupons?select=*&order=updated_at.desc`, { headers });
  const sel = await resSel.json();
  console.log("Selected Coupons currently in DB:", sel.length);
  sel.forEach(s => console.log(` - Email: ${s.email}, Coupon IDs: ${s.coupon_ids}, Updated: ${s.updated_at}`));

  const resIssued = await fetch(`${SUPABASE_URL}/rest/v1/issued_coupons?select=id,customer_email,order_number,title,created_at&order=created_at.desc&limit=5`, { headers });
  const issued = await resIssued.json();
  console.log("\nLast 5 Issued Coupons in DB:");
  issued.forEach(i => console.log(` - Order: ${i.order_number}, Customer: ${i.customer_email}, Coupon: ${i.title}, Created: ${i.created_at}`));
}

run();
