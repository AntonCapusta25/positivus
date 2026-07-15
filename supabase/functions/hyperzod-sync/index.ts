import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json()
    console.log("Database webhook payload received:", JSON.stringify(payload))

    const HYPERZOD_API_KEY = payload.hyperzod_api_key ?? Deno.env.get("HYPERZOD_API_KEY")
    const HYPERZOD_TENANT_ID = payload.hyperzod_tenant_id ?? Deno.env.get("HYPERZOD_TENANT_ID")

    const { table, type, record, old_record } = payload

    if (table === "merchants") {
      if (type === "UPDATE") {
        const nextAcceptState = record.is_accepting_orders;
        const nextOpenState = record.is_open;

        if (nextAcceptState !== old_record.is_accepting_orders || nextOpenState !== old_record.is_open) {
          console.log(`Syncing merchant storefront status update to Hyperzod: is_accepting_orders = ${nextAcceptState}, is_open = ${nextOpenState}`)
          const raw = record.raw_details || {}
          
          const updatePayload = {
            id: record.merchant_id,
            name: raw.name || record.name,
            slug: raw.slug || record.slug,
            phone: raw.phone,
            email: raw.email,
            address: raw.address,
            post_code: raw.post_code,
            city: raw.city,
            country: raw.country,
            country_code: raw.country_code,
            delivery_by: raw.delivery_by,
            accepted_order_types: raw.accepted_order_types || ["delivery", "pickup", "custom_1"],
            status: raw.status ? 1 : 0,
            tax_method: raw.tax_method || "exclusive",
            language_translation: raw.language_translation || [],
            is_accepting_orders: nextAcceptState,
            is_open: nextOpenState,
            commission: [
              { order_type: "delivery", type: "percentage", percent_value: 0, calculate_on_status: 5 },
              { order_type: "pickup", type: "percentage", percent_value: 0, calculate_on_status: 5 },
              { order_type: "custom_1", type: "percentage", percent_value: 0, calculate_on_status: 5 }
            ]
          }

          const response = await fetch("https://api.hyperzod.app/admin/v1/merchant/update", {
            method: "POST",
            headers: {
              "X-API-KEY": HYPERZOD_API_KEY || "",
              "X-TENANT": HYPERZOD_TENANT_ID || "",
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(updatePayload)
          })
          const resData = await response.json()
          console.log("Hyperzod storefront update result:", JSON.stringify(resData))
        }
      }
    } else if (table === "products") {
      if (type === "UPDATE") {
        const nextStockState = record.in_stock
        if (nextStockState !== old_record.in_stock) {
          console.log(`Syncing product stock count update to Hyperzod: product_id = ${record.product_id}, in_stock = ${nextStockState}`)
          const updatePayload = {
            merchant_id: record.merchant_id,
            stock_counts: [
              {
                product_id: record.product_id,
                stock_count: nextStockState ? 500 : 0
              }
            ]
          }

          const response = await fetch("https://api.hyperzod.app/merchant/v1/catalog/product/stock/updateCountBulk", {
            method: "POST",
            headers: {
              "X-API-KEY": HYPERZOD_API_KEY || "",
              "X-TENANT": HYPERZOD_TENANT_ID || "",
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(updatePayload)
          })
          const resData = await response.json()
          console.log("Hyperzod product stock update result:", JSON.stringify(resData))
        }
      }
    } else if (table === "orders") {
      if (type === "UPDATE") {
        const nextStatus = record.status;
        const orderNo = record.order_number;
        
        if (nextStatus && orderNo) {
          const hyperzodOrderId = parseInt(orderNo, 10);
          if (!isNaN(hyperzodOrderId)) {
            const mapSpoonfulStatusToHyperzod = (status: string) => {
              switch (status.toLowerCase()) {
                case 'incoming':
                case 'pending':
                  return 1;
                case 'preparing':
                case 'accepted':
                  return 2;
                case 'ready':
                  return 3;
                case 'collected':
                case 'dispatched':
                  return 4;
                case 'completed':
                  return 5;
                case 'cancelled':
                case 'declined':
                  return 6;
                default:
                  return 2;
              }
            };
            
            const hyperzodStatus = mapSpoonfulStatusToHyperzod(nextStatus);
            console.log(`Syncing order status update to Hyperzod: order_id = ${hyperzodOrderId}, status = ${hyperzodStatus}`);
            
            const response = await fetch("https://api.hyperzod.app/admin/v1/order/update-order-status", {
              method: "POST",
              headers: {
                "X-API-KEY": HYPERZOD_API_KEY || "",
                "X-TENANT": HYPERZOD_TENANT_ID || "",
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                order_id: hyperzodOrderId,
                order_status: hyperzodStatus
              })
            });
            const resData = await response.json();
            console.log("Hyperzod order status update result:", JSON.stringify(resData));

            if (!resData.success && !resData.message?.toLowerCase().includes("already set to")) {
              return new Response(JSON.stringify({ success: false, error: resData.message || "Hyperzod status update failed" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (e) {
    console.error("Webhook processing error:", e)
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
