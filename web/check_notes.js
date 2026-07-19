import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, notes')
        .not('notes', 'is', null)
        .limit(3);
        
    console.log("Orders with notes:");
    orders.forEach(o => {
        console.log(`Order: ${o.order_number}`);
        console.log("Raw Notes:", o.notes);
        console.log("------------------------");
    });
}

check();
