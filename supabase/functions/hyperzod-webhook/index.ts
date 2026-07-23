// Deno Edge Function to handle Hyperzod Order Webhooks
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function sendPushNotifications(newOrder: any, supabase: any) {
  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn("Web Push VAPID keys are not configured in the environment.");
      return;
    }

    if (!newOrder.merchant_id) {
      console.warn("Order has no merchant_id. Skipping push notifications.");
      return;
    }

    webpush.setVapidDetails(
      "mailto:bangalexf@gmail.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Fetch merchant display name from Supabase merchants table
    let merchantName = "Spoonful";
    try {
      const { data: merchantData } = await supabase
        .from("merchants")
        .select("name")
        .eq("merchant_id", newOrder.merchant_id)
        .single();
      if (merchantData && merchantData.name) {
        merchantName = merchantData.name;
      }
    } catch (dbErr) {
      console.warn("Failed to fetch merchant name for push notification:", dbErr);
    }

    // Fetch all active device subscriptions registered for push notifications
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subsError) {
      console.error("Failed to query push subscriptions:", subsError);
      return;
    }

    if (!subs || subs.length === 0) {
      console.log(`No active push subscriptions found for merchant: ${newOrder.merchant_id}`);
      return;
    }

    console.log(`Sending Web Push notifications to ${subs.length} devices for merchant ${merchantName}...`);
    const payload = JSON.stringify({
      title: `${merchantName} - New Kitchen Order!`,
      body: `Order #${newOrder.order_number} for €${Number(newOrder.total).toFixed(2)} (${newOrder.type})`,
      url: `/?incoming_order_id=${newOrder.id}`
    });

    const sendPromises = subs.map((sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };
      return webpush.sendNotification(pushSubscription, payload)
        .catch((err: any) => {
          console.error("Web Push failed for endpoint:", sub.endpoint, err);
          // Cleanup expired subscriptions (status code 410 Gone or 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            supabase.from("push_subscriptions").delete().eq("id", sub.id).then();
          }
        });
    });

    await Promise.allSettled(sendPromises);
    console.log(`Finished sending Web Push notifications for order #${newOrder.order_number}`);
  } catch (pushErr) {
    console.error("Failed to process Web Push notifications:", pushErr);
  }
}

async function processOrderCoupons(orderNumber: string, customerEmail: string, paymentStatus: string, customerPhone: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!SUPABASE_URL || !customerEmail) return;

  console.log(`Forwarding coupon check to issue-coupons edge function for: ${customerEmail}`);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/issue-coupons`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orderNumber,
        customerEmail,
        paymentStatus,
        customerPhone
      })
    });
    if (res.ok) {
      console.log("Coupons edge function successfully triggered!");
    } else {
      console.error("Coupons edge function returned error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Failed to forward request to coupons edge function:", err);
  }
}

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
    const orderNumber = data.order_number || data.order_unique_id || data.order_id?.toString() || `#HZ-${Math.floor(1000 + Math.random() * 9000)}`;
    // Store the raw numeric order_id from Hyperzod so we can push status updates back
    const hyperzodOrderId = Number(data.order_id) || null;
    const customerName = data.customer_name || data.customer?.name || data.user?.full_name || (data.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ""}`.trim() : "") || "Guest Customer";
    const customerPhone = data.customer_phone || data.customer?.phone || data.user?.mobile || data.user?.phone || "";
    const merchantId = data.merchant_id || "restaurant_1";

    // Map cart items
    const rawItems = data.cart?.cart_items || data.cart_items || data.items || [];
    const items = rawItems.map((item: any) => ({
      name: item.product_name || item.name || "Unknown Item",
      quantity: Number(item.quantity) || 1,
      price: Number(item.product_price || item.price || item.total_amount) || 0.0,
      notes: item.product_instruction || item.item_note || item.notes || ""
    }));

    const subtotal = Number(data.cart?.sub_total_amount || data.subtotal || data.sub_total_amount) || 0.0;
    const tax = Number(data.cart?.tax || data.tax) || 0.0;
    const deliveryFee = Number(data.cart?.delivery_fee || data.delivery_charges || data.delivery_fee) || 0.0;
    const discount = Number(data.cart?.discount_amount || data.discount || data.discount_amount) || 0.0;
    const total = Number(data.order_amount || data.cart?.total_amount || data.total_amount || data.total) || (subtotal + tax + deliveryFee - discount);

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

    // Calculate customer order count (loyalty pill)
    let customerOrderCount = 1;
    try {
      let query = supabase.from("orders").select("id", { count: "exact", head: true });
      if (customerPhone && customerPhone.toString().trim() !== "") {
        query = query.eq("customer_phone", customerPhone.toString().trim());
      } else if (customerName && customerName.toString().trim() !== "") {
        query = query.eq("customer_name", customerName.toString().trim());
      } else {
        query = null;
      }

      if (query) {
        const { count, error: countError } = await query;
        if (!countError && count !== null) {
          customerOrderCount = count + 1;
        }
      }
    } catch (e) {
      console.warn("Failed to calculate customer order count:", e);
    }

    // Determine event action
    const eventName = body.event || 'order.created';
    let finalOrderData = null;

    const insertPayload = {
      order_number: orderNumber,
      hyperzod_order_id: hyperzodOrderId,
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
      customer_address: customerAddress,
      customer_order_count: customerOrderCount
    };

    const updatePayload: any = {
      status: mappedStatus,
      notes: JSON.stringify(body),
      updated_at: new Date().toISOString()
    };

    // Only update fields if they were explicitly provided in the webhook payload
    if (data.payment_status) updatePayload.payment_status = paymentStatus;
    if (data.customer_name || data.customer?.name) updatePayload.customer_name = customerName;
    if (data.customer_phone || data.customer?.phone) updatePayload.customer_phone = customerPhone;
    if (data.cart?.cart_items || data.cart_items || data.items) updatePayload.items = items;
    if (data.cart?.sub_total_amount || data.subtotal || data.sub_total_amount) updatePayload.subtotal = subtotal;
    if (data.cart?.tax || data.tax) updatePayload.tax = tax;
    if (data.cart?.delivery_fee || data.delivery_charges || data.delivery_fee) updatePayload.delivery_fee = deliveryFee;
    if (data.cart?.discount_amount || data.discount || data.discount_amount) updatePayload.discount = discount;
    if (data.order_amount || data.cart?.total_amount || data.total_amount || data.total) updatePayload.total = total;
    if (data.delivery_address || data.address) updatePayload.customer_address = customerAddress;
    if (data.order_type) updatePayload.type = type;

    if (eventName === 'order.updated' || eventName === 'order.status_updated') {
      console.log(`Update event received for Order ${orderNumber}. Executing update...`);
      const { data: updatedData, error: updateError } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("order_number", orderNumber)
        .select();

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }

      if (updatedData && updatedData.length > 0) {
        finalOrderData = updatedData;
      } else {
        // Order does not exist yet. Fallback to insert (optimistic insert)
        console.log(`Order ${orderNumber} not found during update. Inserting new record...`);
        const { data: insertedData, error: insertError } = await supabase
          .from("orders")
          .insert([insertPayload])
          .select();

        if (insertError) {
          // If insert failed due to unique key conflict, another request inserted it concurrently. Retry update!
          if (insertError.code === "23505") {
            console.log(`Conflict: Order ${orderNumber} was inserted concurrently. Retrying update...`);
            const { data: retryUpdate, error: retryError } = await supabase
              .from("orders")
              .update(updatePayload)
              .eq("order_number", orderNumber)
              .select();
            if (retryError) throw retryError;
            finalOrderData = retryUpdate;
          } else {
            console.error("Failed fallback insert:", insertError);
            throw insertError;
          }
        } else {
          finalOrderData = insertedData;
          // Dispatch notifications for this new order
          if (finalOrderData && finalOrderData.length > 0) {
            const newOrder = finalOrderData[0];
            const pushPromise = sendPushNotifications(newOrder, supabase);
            if (typeof EdgeRuntime !== 'undefined') {
              // @ts-ignore
              EdgeRuntime.waitUntil(pushPromise);
            } else {
              pushPromise.catch((err) => console.error("Background push error:", err));
            }
          }
        }
      }
    } else {
      console.log(`Creation event received for Order ${orderNumber}. Executing insert...`);
      const { data: insertedData, error: insertError } = await supabase
        .from("orders")
        .insert([insertPayload])
        .select();

      if (insertError) {
        // If insert failed because the order already exists (unique conflict), fallback to update!
        if (insertError.code === "23505") {
          console.log(`Conflict: Order ${orderNumber} already exists. Executing update fallback...`);
          const { data: updatedData, error: updateError } = await supabase
            .from("orders")
            .update(updatePayload)
            .eq("order_number", orderNumber)
            .select();
          if (updateError) throw updateError;
          finalOrderData = updatedData;
        } else {
          console.error("Database insert error:", insertError);
          throw insertError;
        }
      } else {
        finalOrderData = insertedData;
        // Dispatch notifications for this new order
        if (finalOrderData && finalOrderData.length > 0) {
          const newOrder = finalOrderData[0];
          const pushPromise = sendPushNotifications(newOrder, supabase);
          if (typeof EdgeRuntime !== 'undefined') {
            // @ts-ignore
            EdgeRuntime.waitUntil(pushPromise);
          } else {
            pushPromise.catch((err) => console.error("Background push error:", err));
          }
        }
      }
    }

    // Process VIP Coupons selection
    let customerEmail = data.customer_email || data.customer?.email || "";
    if (!customerEmail && customerPhone) {
      customerEmail = `${customerPhone.replace(/[^a-zA-Z0-9]/g, "")}@spoonful.com`;
    }
    if (finalOrderData && finalOrderData.length > 0) {
      const couponPromise = processOrderCoupons(orderNumber, customerEmail, paymentStatus, customerPhone);
      if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(couponPromise);
      } else {
        couponPromise.catch((err) => console.error("Background coupons error:", err));
      }
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
