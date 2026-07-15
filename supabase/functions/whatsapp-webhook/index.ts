// Deno Edge Function to handle WhatsApp Webhooks
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "my_verify_token";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);

  // GET: Handle Webhook Verification from Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Received Verification GET request:", { mode, token, challenge });

    if (mode && token) {
      if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
        console.log("WEBHOOK_VERIFIED successfully");
        return new Response(challenge, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } else {
        console.error("WEBHOOK_VERIFICATION_FAILED: verify token mismatch or incorrect mode");
        return new Response("Forbidden: Verify token mismatch or incorrect mode", {
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    return new Response("Bad Request: Missing parameters", {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // POST: Handle Webhook Notifications from WhatsApp/Meta
  if (req.method === "POST") {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Read payload body
      const payload = await req.json();
      console.log("Received WhatsApp webhook payload:", JSON.stringify(payload));

      // Insert payload into the whatsapp_events table for auditing
      const { data, error } = await supabase
        .from("whatsapp_events")
        .insert([{ payload }])
        .select();

      if (error) {
        console.error("Database insert error:", error);
        // Still return 200 OK to Meta so they don't retry and block the webhook,
        // but log the error clearly.
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      console.log("Logged WhatsApp event successfully:", data);

      return new Response(
        JSON.stringify({ success: true, message: "Event logged successfully" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (err: any) {
      console.error("Failed to process webhook payload:", err);
      // Return 200 to acknowledge receipt to Meta, preventing retries/timeouts
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }

  // Unsupported methods
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
});
