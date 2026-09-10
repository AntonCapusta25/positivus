const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

async function run() {
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=10`, { headers });
  const orders = await res.json();
  for (const order of orders) {
    console.log("==========================================");
    console.log("Order Number:", order.order_number);
    try {
      const parsed = JSON.parse(order.notes);
      const payload = parsed.payload || parsed;
      const cartItems = payload.cart?.cart_items || payload.cart_items || [];
      console.log("Cart Items structure:");
      cartItems.forEach((item, idx) => {
        console.log(` - Item ${idx + 1}: ${item.product_name || item.name} (qty: ${item.quantity})`);
        console.log("   Keys:", Object.keys(item));
        // Check if there are keys like addons, extra, options, instructions
        const extraKeys = Object.keys(item).filter(k => 
          k.toLowerCase().includes("addon") || 
          k.toLowerCase().includes("extra") || 
          k.toLowerCase().includes("option") || 
          k.toLowerCase().includes("choice") ||
          k.toLowerCase().includes("modifier")
        );
        extraKeys.forEach(k => {
          console.log(`   Extra key [${k}]:`, JSON.stringify(item[k]));
        });
      });
    } catch (e) {
      console.log("Failed to parse notes:", e.message);
    }
  }
}

run();
