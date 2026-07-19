import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    // 1. Check orders merchant_id
    const { data: orders, error: err1 } = await supabase
        .from('orders')
        .select('merchant_id')
        .limit(5);
    console.log("Orders merchant_ids:", orders);

    // 2. Check merchants table
    const { data: merchants, error: err2 } = await supabase
        .from('merchants')
        .select('*');
    console.log("Merchants table:", merchants);
}

check();
