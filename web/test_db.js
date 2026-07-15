import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log("Fetching orders table rows...");
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error("Orders Error:", error.message);
    } else {
        console.log(`Found ${orders.length} orders in database:`);
        orders.forEach(o => {
            console.log(`- UUID: ${o.id} | Order No: ${o.order_number} | Status: ${o.status} | Created At: ${o.created_at}`);
            if (o.notes) {
                console.log(`  Notes (Payload): ${o.notes.substring(0, 300)}...`);
            }
        });
    }
}

test();
