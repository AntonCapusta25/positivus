// Deno Edge Function to send VIP Coupon Emails via SendGrid
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderNumber, customerEmail, couponTitles } = await req.json();

    if (!customerEmail || !orderNumber || !couponTitles || !Array.isArray(couponTitles)) {
      return new Response(JSON.stringify({ error: "Missing required fields (orderNumber, customerEmail, couponTitles)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
    const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "info@spoonfulpos.com";
    const SENDGRID_FROM_NAME = Deno.env.get("SENDGRID_FROM_NAME") || "Spoonful VIP Rewards";

    // 14 days expiration formatting
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const expiryFormatted = expiresAt.toLocaleDateString("en-US", {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const htmlBody = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #111111; font-weight: 800; font-size: 24px; margin: 0;">Spoonful POS VIP Rewards ✨</h2>
        </div>
        <p style="color: #444444; font-size: 15px; line-height: 1.5; margin-top: 0;">
          Hi there! Thank you for your payment and order <strong>#${orderNumber}</strong>.
        </p>
        <p style="color: #444444; font-size: 15px; line-height: 1.5;">
          You have successfully unlocked the following VIP coupons:
        </p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <ul style="margin: 0; padding-left: 20px; color: #1e293b; font-weight: 600; font-size: 15px; line-height: 1.8;">
            ${couponTitles.map(c => `<li>${c}</li>`).join("")}
          </ul>
        </div>
        <p style="color: #b45309; background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; line-height: 1.4; margin: 20px 0;">
          ⚠️ <strong>How to Redeem:</strong> Please visit us at our facility and present this email. Our cashier / team member will activate your rewards on the checkout dashboard!
        </p>
        <p style="color: #ef4444; font-size: 13px; font-weight: 700; margin-bottom: 24px;">
          * Expiration Date: These coupons are valid for 14 days and will expire on ${expiryFormatted}.
        </p>
        <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; text-align: center; color: #888888; font-size: 12px;">
          Thank you for choosing Spoonful. We look forward to serving you!
        </div>
      </div>
    `;

    if (SENDGRID_API_KEY) {
      console.log(`Sending VIP coupon email via SendGrid to: ${customerEmail}...`);
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: customerEmail }],
              subject: `Your Spoonful VIP Coupons are Unlocked! (Order #${orderNumber})`,
            },
          ],
          from: {
            email: SENDGRID_FROM_EMAIL,
            name: SENDGRID_FROM_NAME,
          },
          content: [
            {
              type: "text/html",
              value: htmlBody,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SendGrid API returned error:", response.status, errorText);
        throw new Error(`SendGrid API error: ${errorText}`);
      }

      console.log("VIP coupons email successfully dispatched via SendGrid!");
      return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("SENDGRID_API_KEY not configured. Mock Email Output:\n", htmlBody);
      return new Response(JSON.stringify({ success: true, message: "SENDGRID_API_KEY not set. Mock email logged successfully." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    console.error("Email dispatch failed:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
