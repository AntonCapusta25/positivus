import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

const VAPID_PUBLIC_KEY = "BIS8VjzMiYgLGBulijkRK5dcVM66wsYjQm_hN0nFlz3UcC8TP8frYxw6tbf-bAnGJqHugxHwNIuweXmy5nqIaxE";
const VAPID_PRIVATE_KEY = "x067QG8FQKh-yec_SkGP3mUzYRCqL-aZ9ZEkT8E01S0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("1. Setting new matching VAPID keys...");
  webpush.setVapidDetails(
    "mailto:bangalexf@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  console.log("2. Clearing old invalid push subscriptions from database...");
  await supabase.from('push_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Cleaned push_subscriptions table!");
}

run();
