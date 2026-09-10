import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xkhuhbngnryevpnslywo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHVoYm5nbnJ5ZXZwbnNseXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkyNDUwMDUsImV4cCI6MjAzNDgyMTAwNX0.eR6kH_-T2V9yUe1S_y3S0Wv2_S6b7o9lM8fQvQe2xXg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPrintUpdate() {
  console.log("Fetching latest order...");
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, order_number, print_requested_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
    return;
  }

  console.log("Latest order:", order);

  const ts = `BOTH:${new Date().toISOString()}`;
  console.log(`Updating print_requested_at to: ${ts} for order ID ${order.id}...`);

  const { data: updated, error: updateErr } = await supabase
    .from('orders')
    .update({ print_requested_at: ts, printed: false })
    .eq('id', order.id)
    .select();

  if (updateErr) {
    console.error("Update error:", updateErr);
  } else {
    console.log("Update SUCCESS:", updated);
  }
}

testPrintUpdate();
