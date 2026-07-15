import { supabase } from './src/supabaseClient.js';

async function run() {
  console.log("Updating status of order 1007 to preparing...");
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'preparing', preparation_time: 35 })
    .eq('order_number', '1007')
    .select();

  if (error) {
    console.error("Supabase update error:", error.message);
  } else {
    console.log("Supabase update success! Row:", data);
  }
}

run();
