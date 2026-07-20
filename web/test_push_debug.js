import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || "BHrN7J9_uQx7cM7L4z7e7d9e7"; // Let's check VAPID key

async function testPush() {
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  console.log(`Found ${subs.length} push subscriptions in DB:`);
  console.log(subs);
}

testPush();
