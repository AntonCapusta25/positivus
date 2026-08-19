import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "npm:stripe@^14.7.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? ""

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY is not configured on Supabase backend." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch order details from Supabase
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (fetchError || !order) {
      return new Response(JSON.stringify({ error: "Order not found: " + (fetchError?.message || "") }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 2. Initialize Stripe & Search for Payment Intent by Order Number / ID metadata
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" })
    console.log(`Searching Stripe for Order #${order.order_number} or ID ${order.hyperzod_order_id}...`)
    
    const searchQuery = `metadata["order_number"]:"${order.order_number}" OR metadata["order_id"]:"${order.hyperzod_order_id}"`
    const searchResult = await stripe.paymentIntents.search({
      query: searchQuery
    })

    if (!searchResult.data || searchResult.data.length === 0) {
      return new Response(JSON.stringify({ 
        error: `Could not find Stripe transaction for Order #${order.order_number} in Stripe history.` 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const paymentIntent = searchResult.data[0]
    const paymentIntentId = paymentIntent.id

    // 3. Trigger Stripe Refund
    console.log(`Refunding Stripe Payment Intent: ${paymentIntentId} for Order #${order.order_number}`)
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId
    })

    // 6. Update order status to 'cancelled' and payment status to 'refunded'
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "refunded"
      })
      .eq("id", order_id)

    if (updateError) throw updateError

    // 7. Invoke hyperzod-sync function to propagate cancellation back to Hyperzod
    try {
      console.log(`Propagating cancellation back to Hyperzod for order #${order.order_number}`)
      await supabase.functions.invoke('hyperzod-sync', {
        body: {
          table: 'orders',
          type: 'UPDATE',
          record: {
            order_number: order.order_number,
            hyperzod_order_id: order.hyperzod_order_id,
            status: 'cancelled'
          }
        }
      })
    } catch (syncErr) {
      console.warn("Failed to propagate status to Hyperzod inside refund trigger:", syncErr)
    }

    return new Response(JSON.stringify({ success: true, refund }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (err) {
    console.error("Refund failed:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
