import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const { orderNumber, customerEmail, paymentStatus, customerPhone, couponIds: customCouponIds } = body;

    if (!customerEmail) {
      return new Response(JSON.stringify({ success: false, error: "customerEmail is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (paymentStatus !== 'paid' && paymentStatus !== 'pending') {
      return new Response(JSON.stringify({ success: true, message: "Payment status not paid or pending, skipping coupon check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 1. Prevent duplicate coupon issues for the same order_number
    if (orderNumber) {
      const { data: existing } = await supabase
        .from("issued_coupons")
        .select("id")
        .eq("order_number", orderNumber)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ success: true, message: `Coupons already issued for order ${orderNumber}. Skipping.` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 2. Resolve Coupon IDs (use custom override if specified, otherwise query pending selected_coupons)
    let couponIds = customCouponIds || [];
    const cleanEmail = customerEmail.toLowerCase().trim();

    if (couponIds.length === 0) {
      const { data: selectionRecord, error: selError } = await supabase
        .from("selected_coupons")
        .select("*")
        .eq("email", cleanEmail)
        .single();

      if (selError || !selectionRecord) {
        return new Response(JSON.stringify({ success: true, message: `No pending coupons found for customer email: ${cleanEmail}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      couponIds = selectionRecord.coupon_ids || [];
    }

    if (!Array.isArray(couponIds) || couponIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No coupons to issue" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Check Active Capacity Limit (Max 1000 active, unexpired coupons)
    const { count, error: countError } = await supabase
      .from("issued_coupons")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (countError) throw countError;

    const currentActiveCount = count || 0;
    if (currentActiveCount >= 1000) {
      return new Response(JSON.stringify({ success: false, error: "Active coupons cap reached (1000)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Map of template details for standard coupons
    const COUPON_METADATA: any = {
      coupon_1: { title: "Free Priority Delivery", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80" },
      coupon_2: { title: "10% Off Next Order", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" },
      coupon_3: { title: "Free Mango Lassi", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80" },
      coupon_4: { title: "Chef's Secret Sauce", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=400&q=80" }
    };

    // 4. Generate & Insert Coupon Records
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const maxInsertCount = Math.min(couponIds.length, 1000 - currentActiveCount);
    const toInsert = [];
    const emailCoupons = [];

    for (let i = 0; i < maxInsertCount; i++) {
      const code = couponIds[i];
      const meta = COUPON_METADATA[code] || { title: "VIP Promo Offer", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" };
      toInsert.push({
        order_number: orderNumber || null,
        customer_email: cleanEmail,
        coupon_code: code,
        title: meta.title,
        discount_label: meta.discount_label,
        image_url: meta.image_url,
        expires_at: expiresAt,
        status: "active"
      });
      emailCoupons.push(meta.title);
    }

    if (toInsert.length > 0) {
      const { error: insError } = await supabase.from("issued_coupons").insert(toInsert);
      if (insError) throw insError;
      console.log(`Successfully issued ${toInsert.length} coupons to: ${cleanEmail}`);
    }

    // 5. Clean up pending selections
    await supabase.from("selected_coupons").delete().eq("email", cleanEmail);

    // 6. Trigger SendGrid email notification
    if (toInsert.length > 0 && SUPABASE_URL) {
      console.log(`Triggering decoupled send-coupon-email edge function for: ${cleanEmail}`);
      try {
        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-coupon-email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            orderNumber: orderNumber || "",
            customerEmail: cleanEmail,
            couponTitles: emailCoupons
          })
        });
        if (emailRes.ok) {
          console.log("VIP coupons email edge function triggered successfully!");
        } else {
          console.error("Coupons email edge function returned error:", emailRes.status, await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Failed to trigger coupons email edge function:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, issued_count: toInsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Coupons processing failed:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
