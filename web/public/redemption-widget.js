// REDEMPTION WIDGET (Standalone Success Script for Hyperzod Storefront)
// Load this script on the Hyperzod Order Success / Thank You page to let customers view & staff redeem coupons.
// <script src="https://[YOUR_VERCEL_DOMAIN]/redemption-widget.js"></script>

(function() {
  console.log("VIP Redemption Success Widget Initializing...");

  const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

  function injectWidgetStyles() {
    if (document.getElementById('redemption-widget-css')) return;
    const style = document.createElement('style');
    style.id = 'redemption-widget-css';
    style.innerHTML = `
      #loyalty-redemption-widget { margin: 24px auto; padding: 24px; max-width: 480px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 24px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05); font-family: 'Inter', -apple-system, sans-serif; position: relative; z-index: 100; text-align: left; }
      .redemption-title { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; letter-spacing: -0.5px; }
      .redemption-subtitle { font-size: 11px; color: #64748b; font-weight: 600; margin: 0 0 16px 0; }
      .redemption-input-container { display: flex; gap: 8px; margin-bottom: 16px; }
      .redemption-input { flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 12px; font-weight: 600; outline: none; background: #fff; }
      .redemption-btn { padding: 10px 16px; background: #01C267; color: #fff; border: none; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
      .redemption-btn:hover { opacity: 0.95; }
      .redemption-scroll { display: flex; overflow-x: auto; gap: 14px; padding-bottom: 12px; }
      .redemption-scroll::-webkit-scrollbar { display: none; }
      .redemption-card { min-width: 140px; max-width: 140px; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; padding: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-col: column; justify-content: space-between; }
      .redemption-card-img { width: 100%; height: 75px; border-radius: 8px; object-fit: cover; margin-bottom: 8px; }
      .redemption-card-title { font-size: 12px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
      .redemption-card-label { font-size: 10px; font-weight: 800; color: #01C267; margin-bottom: 8px; }
      .redemption-card-btn { width: 100%; padding: 6px 0; background: #f97316; color: #fff; border: none; border-radius: 8px; font-size: 10px; font-weight: 700; cursor: pointer; text-transform: uppercase; }
      .redemption-info-btn { cursor: pointer; font-size: 10px; background: #f1f5f9; color: #64748b; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    `;
    document.head.appendChild(style);
  }

  let activeCoupons = [];
  let customerEmail = localStorage.getItem('lastSyncedEmail') || '';

  async function fetchIssuedCoupons(email) {
    if (!email) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/issued_coupons?customer_email=eq.${email.toLowerCase().trim()}&status=eq.active`, {
        method: "GET",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`
        }
      });
      const data = await res.json();
      
      // Filter out expired client side
      activeCoupons = (data || []).filter(c => new Date(c.expires_at) >= new Date());
      renderActiveCoupons();
    } catch (e) {
      console.warn("Failed to fetch customer active coupons:", e);
    }
  }

  function showCouponInfo(coupon) {
    const existing = document.getElementById('pro-info-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pro-info-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '999999';

    modal.innerHTML = `
      <div style="background: white; padding: 24px; border-radius: 20px; max-width: 320px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.15); font-family: sans-serif; position: relative; text-align: left; color: #333;">
        <span class="pro-modal-close" style="position: absolute; top: 16px; right: 16px; font-size: 18px; cursor: pointer; color: #aaa; font-weight: bold;">&times;</span>
        <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 800; color: #111;">${coupon.title}</h4>
        <p style="margin: 0 0 16px 0; font-size: 11px; color: #666; line-height: 1.4;">
          This VIP reward is active on your customer account.
          <br/><br/>
          <strong>Redemption Period:</strong> Expires on ${new Date(coupon.expires_at).toLocaleDateString()}.
          <br/>
          <strong>Quantity:</strong> 1 Coupon Code verification.
        </p>
        <button class="pro-modal-btn" style="width: 100%; background: #f97316; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px; padding: 9px 0;">Got it</button>
      </div>
    `;

    modal.querySelector('.pro-modal-close').onclick = () => modal.remove();
    modal.querySelector('.pro-modal-btn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    document.body.appendChild(modal);
  }

  async function triggerRedemption(coupon) {
    const existing = document.getElementById('pro-pin-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pro-pin-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '999999';

    modal.innerHTML = `
      <div style="background: white; padding: 24px; border-radius: 20px; max-width: 320px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.15); font-family: sans-serif; position: relative; text-align: center; color: #333;">
        <span class="pro-modal-close" style="position: absolute; top: 16px; right: 16px; font-size: 18px; cursor: pointer; color: #aaa; font-weight: bold;">&times;</span>
        <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #111;">Staff Verification PIN</h4>
        <p style="margin: 0 0 16px 0; font-size: 11px; color: #666; line-height: 1.4;">
          Please present this screen to the restaurant staff to enter their secret Admin PIN and redeem this coupon.
        </p>
        <input type="password" class="pro-pin-input" placeholder="••••" maxLength="8" style="width: 100%; text-align: center; padding: 12px; font-size: 18px; font-weight: 800; border: 1px solid #cbd5e1; border-radius: 12px; margin-bottom: 12px; letter-spacing: 4px; outline: none;" />
        <div class="pro-pin-error" style="color: red; font-size: 10px; font-weight: bold; margin-bottom: 12px; display: none;"></div>
        <button class="pro-pin-submit" style="width: 100%; background: #01C267; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px; padding: 10px 0;">Verify & Redeem</button>
      </div>
    `;

    const pinInput = modal.querySelector('.pro-pin-input');
    const pinError = modal.querySelector('.pro-pin-error');

    modal.querySelector('.pro-modal-close').onclick = () => modal.remove();
    modal.querySelector('.pro-pin-submit').onclick = async () => {
      const enteredPin = pinInput.value.trim();
      if (!enteredPin) return;

      try {
        // Query merchant admin PIN
        const mRes = await fetch(`${SUPABASE_URL}/rest/v1/merchants?select=admin_pin&limit=1`, {
          method: "GET",
          headers: {
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`
          }
        });
        const mData = await mRes.json();
        const correctPin = mData?.[0]?.admin_pin || '1234';

        if (enteredPin !== correctPin) {
          pinError.innerText = "Invalid Staff PIN. Try again.";
          pinError.style.display = "block";
          pinInput.value = "";
          return;
        }

        // Patch to redeem
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/issued_coupons?id=eq.${coupon.id}`, {
          method: "PATCH",
          headers: {
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            status: "redeemed",
            redeemed_at: new Date().toISOString()
          })
        });

        if (!patchRes.ok) throw new Error("Patch failed");

        modal.remove();
        showRedemptionSuccess(coupon);
        fetchIssuedCoupons(customerEmail);
      } catch (err) {
        pinError.innerText = "Redemption failed: " + err.message;
        pinError.style.display = "block";
      }
    };

    document.body.appendChild(modal);
  }

  function showRedemptionSuccess(coupon) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(17, 24, 39, 0.95)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999999';
    modal.style.color = '#fff';
    modal.style.fontFamily = 'sans-serif';
    modal.style.padding = '24px';

    modal.innerHTML = `
      <div style="background: #1f2937; border: 1px solid #374151; padding: 32px 24px; border-radius: 28px; max-width: 320px; width: 100%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.3);">
        <span style="font-size: 48px; display: block; margin-bottom: 16px;">🎉</span>
        <h3 style="font-size: 16px; font-weight: 900; margin: 0 0 8px 0; color: #fff;">Coupon Redeemed!</h3>
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.4; margin: 0 0 20px 0;">
          Staff has successfully verified and approved the discount:
          <br/>
          <strong style="color: #fff; font-size: 13px; display: block; margin-top: 6px;">"${coupon.title}"</strong>
        </p>
        <button class="pro-success-close" style="width: 100%; background: #01C267; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px; padding: 10px 0;">Got it</button>
      </div>
    `;

    modal.querySelector('.pro-success-close').onclick = () => modal.remove();
    document.body.appendChild(modal);
  }

  function renderActiveCoupons() {
    const listContainer = document.getElementById('loyalty-redemption-list');
    if (!listContainer) return;

    if (activeCoupons.length === 0) {
      listContainer.innerHTML = `
        <div style="width: 100%; text-align: center; color: #64748b; font-size: 12px; font-weight: 600; padding: 12px 0;">
          No active coupons found for this email.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    activeCoupons.forEach(coupon => {
      const card = document.createElement('div');
      card.className = 'redemption-card';
      
      const imgHtml = coupon.image_url 
        ? `<img class="redemption-card-img" src="${coupon.image_url}" alt="" />`
        : `<div style="width:100%; height:75px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:8px;">🏷️</div>`;

      card.innerHTML = `
        ${imgHtml}
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; margin-bottom: 2px;">
          <h4 class="redemption-card-title">${coupon.title}</h4>
          <span class="redemption-info-btn">i</span>
        </div>
        <div class="redemption-card-label">${coupon.discount_label}</div>
        <button class="redemption-card-btn">Redeem PIN</button>
      `;

      card.querySelector('.redemption-info-btn').onclick = (e) => {
        e.stopPropagation();
        showCouponInfo(coupon);
      };

      card.querySelector('.redemption-card-btn').onclick = () => {
        triggerRedemption(coupon);
      };

      listContainer.appendChild(card);
    });
  }

  function initRedemptionWidget() {
    if (document.getElementById('loyalty-redemption-widget')) return;
    
    injectWidgetStyles();

    const widget = document.createElement('div');
    widget.id = 'loyalty-redemption-widget';

    widget.innerHTML = `
      <h3 class="redemption-title">Your Rewards Wallet 🎁</h3>
      <p class="redemption-subtitle">View and redeem your active VIP purchase coupons at the counter.</p>
      
      <div class="redemption-input-container">
        <input type="email" class="redemption-input" id="loyalty-wallet-email-input" placeholder="Enter email to load rewards..." value="${customerEmail}" />
        <button class="redemption-btn" id="loyalty-wallet-load-btn">Load</button>
      </div>

      <div class="redemption-scroll" id="loyalty-redemption-list">
        <div style="width: 100%; text-align: center; color: #64748b; font-size: 11px; font-weight: 600; padding: 12px 0;">
          Provide your email address above to fetch your issued loyalty cards.
        </div>
      </div>
    `;

    const loadBtn = widget.querySelector('#loyalty-wallet-load-btn');
    const emailInput = widget.querySelector('#loyalty-wallet-email-input');

    const handleLoad = () => {
      const email = emailInput.value.trim();
      if (email && email.includes('@')) {
        customerEmail = email;
        localStorage.setItem('lastSyncedEmail', email);
        fetchIssuedCoupons(email);
      }
    };

    loadBtn.onclick = handleLoad;
    emailInput.onkeypress = (e) => { if (e.key === 'Enter') handleLoad(); };

    // Auto-mount inside thank you order container or page root
    const successCard = document.querySelector('.order-success') || document.querySelector('.thank-you') || document.querySelector('.checkout-success');
    if (successCard) {
      successCard.appendChild(widget);
    } else {
      // Append to main page body content
      const content = document.getElementById('content') || document.body;
      content.appendChild(widget);
    }

    if (customerEmail) {
      fetchIssuedCoupons(customerEmail);
    }
  }

  // Poll for the page confirmation element to render
  function pollForSuccessPage() {
    const isSuccessPage = window.location.pathname.includes('success') || 
                          window.location.pathname.includes('thank-you') ||
                          document.querySelector('.order-success') !== null ||
                          document.querySelector('.thank-you') !== null;

    if (isSuccessPage) {
      initRedemptionWidget();
    }
  }

  setInterval(pollForSuccessPage, 1000);
})();
