// Deno Edge Function to handle Hyperzod Order Webhooks
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Handle verification ping/GET requests from Hyperzod or verification checks
  if (req.method === "GET") {
    return new Response(JSON.stringify({ success: true, message: "Webhook endpoint is active" }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 200,
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read payload
    const body = await req.json();
    console.log("Received Hyperzod webhook payload:", JSON.stringify(body));

    // Map Hyperzod fields to Spoonful POS orders table schema
    // Hyperzod payload structure typically:
    // {
    //   "order_id": 12345,
    //   "order_unique_id": "HZ-9981-88",
    //   "customer_name": "John Doe",
    //   "customer_phone": "+1234567890",
    //   "cart_items": [{"product_name": "Cheese Burger", "quantity": 1, "product_price": 8.99, "item_note": "No pickle"}],
    //   "subtotal": 8.99,
    //   "tax": 0.80,
    //   "delivery_charges": 2.50,
    //   "discount": 0.00,
    //   "total_amount": 12.29,
    //   "payment_mode": "Online",
    //   "payment_status": "Success",
    //   "order_type": "Delivery",
    //   "notes": "Please leave at door."
    // }
    
    // Normalize payload wrapper (Hyperzod wraps webhooks in { event, payload })
    const data = body.payload || body;

    // Normalization logic with fallbacks
    const orderNumber = data.order_unique_id || data.order_id?.toString() || `#HZ-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerName = data.customer_name || data.customer?.name || "Guest Customer";
    const customerPhone = data.customer_phone || data.customer?.phone || "";
    const merchantId = data.merchant_id || "restaurant_1";
    
    // Map cart items
    const rawItems = data.cart_items || data.items || [];
    const items = rawItems.map((item: any) => ({
      name: item.product_name || item.name || "Unknown Item",
      quantity: Number(item.quantity) || 1,
      price: Number(item.product_price || item.price) || 0.0,
      notes: item.item_note || item.notes || ""
    }));

    const subtotal = Number(data.subtotal || data.sub_total_amount) || 0.0;
    const tax = Number(data.tax) || 0.0;
    const deliveryFee = Number(data.delivery_charges || data.delivery_fee) || 0.0;
    const discount = Number(data.discount || data.discount_amount) || 0.0;
    const total = Number(data.total_amount || data.total) || (subtotal + tax + deliveryFee - discount);
    
    const type = (data.order_type || "dine_in").toLowerCase(); // delivery, pickup, dine_in
    let paymentMethod = "online";
    if (data.payment_mode) {
      if (typeof data.payment_mode === "string") {
        paymentMethod = data.payment_mode.toLowerCase();
      } else if (typeof data.payment_mode === "object" && data.payment_mode.alias) {
        paymentMethod = data.payment_mode.alias.toLowerCase();
      } else if (typeof data.payment_mode === "object" && data.payment_mode.name) {
        paymentMethod = data.payment_mode.name.toLowerCase();
      }
    } else if (data.payment_method) {
      if (typeof data.payment_method === "string") {
        paymentMethod = data.payment_method.toLowerCase();
      }
    }
    const paymentStatus = (data.payment_status === "Success" || data.payment_status === "Paid" || data.payment_status === "paid") ? "paid" : "pending";
    const notes = data.notes || data.order_instruction || "";

    // Format full address from delivery_address object
    let customerAddress = "";
    if (data.delivery_address) {
      const addr = data.delivery_address;
      const streetAndNumber = [addr.address, addr.building].filter((p: any) => p && p.toString().trim() !== "").join(" ");
      const zipAndCity = [addr.zip_code, addr.city].filter((p: any) => p && p.toString().trim() !== "").join(" ");
      const parts = [streetAndNumber, zipAndCity].filter((p: any) => p && p.toString().trim() !== "");
      customerAddress = parts.join("\n");
    } else if (data.address) {
      customerAddress = data.address;
    }

    // Map Hyperzod status code or label to Spoonful string status
    let mappedStatus = "incoming";
    const statusVal = data.order_status ?? data.status ?? data.status_id;
    
    if (statusVal !== undefined && statusVal !== null) {
      const statusStr = statusVal.toString().toLowerCase();
      if (statusStr === "1" || statusStr === "pending" || statusStr === "incoming") {
        mappedStatus = "incoming";
      } else if (statusStr === "2" || statusStr === "accepted" || statusStr === "preparing" || statusStr === "processing" || statusStr === "accepted/preparing") {
        mappedStatus = "preparing";
      } else if (statusStr === "3" || statusStr === "ready") {
        mappedStatus = "ready";
      } else if (statusStr === "4" || statusStr === "collected" || statusStr === "dispatched" || statusStr === "picked") {
        mappedStatus = "dispatched";
      } else if (statusStr === "5" || statusStr === "completed") {
        mappedStatus = "completed";
      } else if (statusStr === "6" || statusStr === "cancelled" || statusStr === "declined") {
        mappedStatus = "cancelled";
      }
    }

    // Check if order already exists in Supabase
    const { data: existingOrder, error: selectError } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (selectError) {
      console.error("Database select error:", selectError);
      throw selectError;
    }

    let finalOrderData = null;

    if (existingOrder) {
      console.log(`Order ${orderNumber} already exists (UUID: ${existingOrder.id}). Updating record...`);
      const { data: updatedData, error: updateError } = await supabase
        .from("orders")
        .update({
          status: mappedStatus,
          payment_status: paymentStatus,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: items,
          subtotal: subtotal,
          tax: tax,
          delivery_fee: deliveryFee,
          discount: discount,
          total: total,
          customer_address: customerAddress,
          notes: JSON.stringify(body) // Store raw payload for debugging!
        })
        .eq("id", existingOrder.id)
        .select();

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }
      finalOrderData = updatedData;
    } else {
      console.log(`Order ${orderNumber} is new. Inserting record...`);
      const { data: insertedData, error: insertError } = await supabase
        .from("orders")
        .insert([
          {
            order_number: orderNumber,
            customer_name: customerName,
            customer_phone: customerPhone,
            merchant_id: merchantId,
            items: items,
            subtotal: subtotal,
            tax: tax,
            delivery_fee: deliveryFee,
            discount: discount,
            total: total,
            status: mappedStatus,
            type: type,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            notes: JSON.stringify(body), // Store raw payload for debugging!
            printed: false,
            customer_address: customerAddress
          }
        ])
        .select();

      if (insertError) {
        console.error("Database insert error:", insertError);
        throw insertError;
      }
      finalOrderData = insertedData;
    }

    return new Response(JSON.stringify({ success: true, order: finalOrderData }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 400,
    });
  }
});
