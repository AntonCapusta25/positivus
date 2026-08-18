// PREMIUM PRO ACTIONS WIDGET (Standalone Script)
// Copy-paste this script URL into your Hyperzod Storefront Custom JavaScript settings:
// e.g. <script src="https://[YOUR_VERCEL_DOMAIN]/coupon-widget.js"></script>

(function() {
  console.log("Premium Pro Actions Widget Initializing...");

  const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

  // 1. Inject the Glassmorphism CSS dynamically
  function injectPremiumStyles() {
    try {
      if (document.getElementById('premium-widget-css')) return;
      const style = document.createElement('style');
      style.id = 'premium-widget-css';
      style.innerHTML = `
        #pro-actions-widget { 
          position: fixed; 
          bottom: 84px; 
          right: 24px; 
          width: 350px; 
          max-width: calc(100vw - 48px); 
          padding: 20px; 
          background: rgba(255, 255, 255, 0.98); 
          border: 1px solid rgba(0, 0, 0, 0.08); 
          border-radius: 24px; 
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12); 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
          z-index: 2147483647; 
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
          display: none; 
          opacity: 0;
          transform: translateY(20px);
        }
        #pro-actions-widget.active {
          display: block !important;
          opacity: 1 !important;
          transform: translateY(0);
        }
        #pro-actions-launcher {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #01C267;
          color: white;
          border-radius: 50px;
          padding: 12px 20px;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 10px 25px rgba(1, 194, 103, 0.3);
          cursor: pointer;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }
        #pro-actions-launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(1, 194, 103, 0.4);
        }
        #pro-actions-launcher.hidden {
          display: none !important;
        }
        .pro-actions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .pro-actions-title { font-size: 15px; font-weight: 800; color: #111; margin: 0; letter-spacing: -0.3px; }
        .pro-actions-close { font-size: 20px; color: #aaa; cursor: pointer; font-weight: bold; padding: 4px; line-height: 1; transition: color 0.2s; }
        .pro-actions-close:hover { color: #333; }
        .pro-actions-subtitle { font-size: 9px; color: #fff; font-weight: 700; background: linear-gradient(135deg, #01C267, #0B9E56); padding: 4px 10px; border-radius: 20px; }
        .pro-actions-subtitle.locked { background: #eab308; color: #854d0e; }
        .pro-actions-warning { font-size: 11px; color: #854d0e; font-weight: 750; background: #fef9c3; border: 1px solid #eab308; padding: 8px 12px; border-radius: 10px; margin-bottom: 12px; text-align: center; }
        .pro-actions-scroll-container { display: flex; overflow-x: auto; gap: 12px; padding: 2px 2px 10px 2px; }
        .pro-actions-scroll-container::-webkit-scrollbar { display: none; }
        .pro-card { min-width: 105px; max-width: 105px; background: #fff; border-radius: 12px; padding: 8px; cursor: pointer; border: 1px solid rgba(0, 0, 0, 0.06); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02); transition: all 0.2s ease; position: relative; }
        .pro-card:hover { transform: translateY(-2px); border-color: rgba(1, 194, 103, 0.25); }
        .pro-card.selected { background: #f0fdf4; border-color: #01C267; box-shadow: 0 0 0 1px #01C267; }
        .pro-card.selected::after { content: '✓'; position: absolute; top: 6px; right: 6px; background: #01C267; color: #fff; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; }
        .pro-card.disabled { opacity: 0.35; pointer-events: none !important; filter: grayscale(100%); }
        .pro-card-img { width: 100%; height: 60px; border-radius: 8px; object-fit: cover; margin-bottom: 8px; background: #f5f5f5; }
        .pro-card-title { font-size: 10px; font-weight: 700; color: #111; margin: 0 0 4px 0; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pro-card-price { font-size: 9px; font-weight: 800; color: #01C267; margin: 0; }
      `;
      document.head.appendChild(style);
    } catch (e) {
      console.warn("Failed to inject styles:", e);
    }
  }

  const MAX_SELECTIONS = 3;
  const selectedProCards = new Set();

  let PRO_ACTIONS = [];
  let isFetchingCoupons = false;
  let isCouponsLoaded = false;

  async function fetchLivePublicCoupons() {
    if (isFetchingCoupons || isCouponsLoaded) return;
    isFetchingCoupons = true;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/issued_coupons?customer_email=eq.public&status=eq.active`, {
        method: "GET",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`
        }
      });
      const data = await res.json();
      const activeData = (data || []).filter(c => new Date(c.expires_at) >= new Date());
      if (activeData && activeData.length > 0) {
        PRO_ACTIONS = activeData.map(c => ({
          id: c.coupon_code,
          title: c.title,
          price: c.discount_label,
          image: c.image_url || 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80'
        }));
      } else {
        PRO_ACTIONS = [
          { id: "coupon_1", title: "Free Priority Delivery", price: "Select", image: "https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80" },
          { id: "coupon_2", title: "10% Off Next Order", price: "Select", image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" }
        ];
      }
      isCouponsLoaded = true;
    } catch (e) {
      console.warn("Failed to fetch public coupons, using fallback:", e);
      PRO_ACTIONS = [
        { id: "coupon_1", title: "Free Priority Delivery", price: "Select", image: "https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80" },
        { id: "coupon_2", title: "10% Off Next Order", price: "Select", image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" }
      ];
      isCouponsLoaded = true;
    } finally {
      isFetchingCoupons = false;
    }
  }

  // Pre-fetch immediately
  fetchLivePublicCoupons();

  function getCartTotal() {
    try {
      if (!document || !document.body) return 0;
      let maxVal = 0;
      
      // 1. Search text contents
      const bodyText = (document.body.innerText || "").toLowerCase();
      const subtotalRegex = /(subtotal|totaal|total|totaalbedrag)[^\d\n]*€?\s*(\d+[\.,]\d{2})/g;
      let match;
      while ((match = subtotalRegex.exec(bodyText)) !== null) {
        const val = parseFloat(match[2].replace(',', '.'));
        if (val > maxVal) maxVal = val;
      }
      
      // 2. Try classes with common pricing keywords
      const priceEls = document.querySelectorAll('[class*="price"], [class*="total"], [class*="subtotal"], [class*="amount"]');
      priceEls.forEach(el => {
        const text = (el.innerText || "").trim().replace(',', '.');
        const matchNum = text.match(/\d+(\.\d{2})?/);
        if (matchNum) {
          const val = parseFloat(matchNum[0]);
          if (val > maxVal) maxVal = val;
        }
      });

      return maxVal;
    } catch (err) {
      return 0;
    }
  }

  async function upsertSelectedCoupons(email, couponIds) {
    if (!email || !email.includes('@')) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/selected_coupons`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          coupon_ids: couponIds,
          updated_at: new Date().toISOString()
        })
      });
      console.log("Synced selected coupons to database for:", email);
    } catch (e) {
      console.warn("Failed to sync coupon selections with database:", e);
    }
  }

  let lastSyncedEmail = "";
  let lastSyncedCouponsStr = "";

  function checkEmailAndSync() {
    try {
      if (!document || !document.body) return;
      const emailInput = document.querySelector('input[type="email"]') || 
                         document.querySelector('input[name="email"]') || 
                         document.querySelector('input[placeholder*="email"]');
      const currentEmail = emailInput ? emailInput.value.trim() : "";
      const currentCouponsStr = Array.from(selectedProCards).join(",");

      if (currentEmail && currentEmail.includes('@')) {
        if (currentEmail !== lastSyncedEmail || currentCouponsStr !== lastSyncedCouponsStr) {
          lastSyncedEmail = currentEmail;
          lastSyncedCouponsStr = currentCouponsStr;
          upsertSelectedCoupons(currentEmail, Array.from(selectedProCards));
        }
      }
    } catch (err) {
      console.warn("checkEmailAndSync error:", err);
    }
  }

  function showCouponInfoModal(action) {
    try {
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
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 20px; max-width: 300px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.15); font-family: sans-serif; position: relative; text-align: left;">
          <span class="pro-modal-close" style="position: absolute; top: 12px; right: 16px; font-size: 18px; cursor: pointer; color: #aaa; font-weight: bold;">&times;</span>
          <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: #111;">${action.title}</h4>
          <p style="margin: 0 0 14px 0; font-size: 11px; color: #666; line-height: 1.4;">
            This VIP offer gives you "${action.title}" on your order. 
            <br/><br/>
            <strong>Redemption Period:</strong> Valid for 14 days after purchase.
            <br/>
            <strong>Coupon Limit:</strong> Maximum 3 coupon selections per order.
          </p>
          <button class="pro-modal-btn" style="width: 100%; background: #01C267; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px; padding: 9px 0;">Got it</button>
        </div>
      `;

      modal.querySelector('.pro-modal-close').onclick = () => modal.remove();
      modal.querySelector('.pro-modal-btn').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      document.body.appendChild(modal);
    } catch (e) {
      console.warn("Failed to show info modal:", e);
    }
  }

  function initPremiumWidget() {
    try {
      if (!isCouponsLoaded) {
        fetchLivePublicCoupons().then(() => {
          if (isCouponsLoaded) initPremiumWidget();
        });
        return;
      }

      if (document.getElementById('pro-actions-widget')) return;
      
      injectPremiumStyles();

      // 1. Create floating sheet card
      const widget = document.createElement('div');
      widget.id = 'pro-actions-widget';

      const header = document.createElement('div');
      header.className = 'pro-actions-header';
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 class="pro-actions-title">VIP Offers ✨</h3>
          <span class="pro-actions-subtitle" id="pro-actions-status-badge">Unlocked!</span>
        </div>
        <span class="pro-actions-close">&times;</span>
      `;
      widget.appendChild(header);

      const warning = document.createElement('div');
      warning.id = 'pro-actions-warning-banner';
      warning.className = 'pro-actions-warning';
      warning.style.display = 'none';
      widget.appendChild(warning);

      const scrollContainer = document.createElement('div');
      scrollContainer.className = 'pro-actions-scroll-container';

      PRO_ACTIONS.forEach(action => {
        const card = document.createElement('div');
        card.className = 'pro-card';
        card.dataset.id = action.id;
        card.innerHTML = `
          <img class="pro-card-img" src="${action.image}" alt="${action.title}" loading="lazy" />
          <h4 class="pro-card-title">${action.title}</h4>
          <p class="pro-card-price">${action.price}</p>
        `;

        card.addEventListener('click', () => {
          const total = getCartTotal();
          if (total < 50) return;

          if (selectedProCards.has(action.id)) {
            selectedProCards.delete(action.id);
            card.classList.remove('selected');
          } else {
            if (selectedProCards.size >= MAX_SELECTIONS) return;
            selectedProCards.add(action.id);
            card.classList.add('selected');
          }
          checkEmailAndSync();
        });

        scrollContainer.appendChild(card);
      });

      widget.appendChild(scrollContainer);
      document.body.appendChild(widget);

      // 2. Create Floating Launcher Button
      const launcher = document.createElement('div');
      launcher.id = 'pro-actions-launcher';
      launcher.innerHTML = `<span>🎟️ VIP Offers</span>`;
      
      launcher.addEventListener('click', () => {
        launcher.classList.add('hidden');
        widget.classList.add('active');
      });

      widget.querySelector('.pro-actions-close').addEventListener('click', () => {
        widget.classList.remove('active');
        launcher.classList.remove('hidden');
      });

      document.body.appendChild(launcher);
    } catch (err) {
      console.warn("initPremiumWidget error:", err);
    }
  }

  function isCartEmpty() {
    try {
      if (!document || !document.body) return true;
      const text = (document.body.innerText || "").toLowerCase();
      return text.includes("once you add items") || 
             text.includes("cart is empty") || 
             text.includes("winkelwagen is leeg") ||
             text.includes("winkelwagen leeg");
    } catch (e) {
      return true;
    }
  }

  // Polling check to ensure it injects and toggles dynamically as cart updates
  function checkAndToggleWidget() {
    try {
      if (!document || !document.body) return;
      const hasCartCard = document.getElementById('CartCard') !== null;
      const hasCheckout = document.getElementById('checkout') !== null;

      // Check for success screen indicators
      const hasSuccessClass = document.querySelector('.order-success') !== null || 
                              document.querySelector('.thank-you') !== null || 
                              document.querySelector('.checkout-success') !== null || 
                              document.querySelector('.order-confirmation') !== null;
                              
      const bodyText = (document.body.innerText || "").toLowerCase();
      const hasSuccessText = bodyText.includes("thank you") || 
                             bodyText.includes("order placed") || 
                             bodyText.includes("bestelling geplaatst") ||
                             bodyText.includes("order number") ||
                             bodyText.includes("bestelnummer") ||
                             bodyText.includes("bestelling succesvol");

      const isSuccessOrOrderPage = hasSuccessClass || 
                                   hasSuccessText ||
                                   window.location.pathname.includes('success') || 
                                   window.location.pathname.includes('thank-you') || 
                                   window.location.pathname.includes('order') ||
                                   window.location.pathname.includes('status') ||
                                   window.location.pathname.includes('confirmation') ||
                                   window.location.pathname.includes('payment');

      // If active checkout containers are gone, or if success page is detected, destroy the widgets
      if (isSuccessOrOrderPage || (!hasCartCard && !hasCheckout)) {
        const widget = document.getElementById('pro-actions-widget');
        if (widget) widget.remove();
        const launcher = document.getElementById('pro-actions-launcher');
        if (launcher) launcher.remove();
        return;
      }

      const isCartOrCheckoutPage = (window.location.pathname.includes('checkout') || window.location.pathname.includes('cart')) && !isSuccessOrOrderPage;
      
      if (isCartOrCheckoutPage) {
        if (isCartEmpty()) {
          const widget = document.getElementById('pro-actions-widget');
          if (widget) widget.classList.remove('active');
          const launcher = document.getElementById('pro-actions-launcher');
          if (launcher) launcher.classList.add('hidden');
        } else {
          const widget = document.getElementById('pro-actions-widget');
          const launcher = document.getElementById('pro-actions-launcher');
          
          if (!widget && !launcher) {
            initPremiumWidget();
          } else {
            // Restore launcher visibility if drawer collapsed
            if (widget && !widget.classList.contains('active') && launcher && launcher.classList.contains('hidden')) {
              launcher.classList.remove('hidden');
            }
          }

          // Live Total Check and UI update
          const total = getCartTotal();
          const warning = document.getElementById('pro-actions-warning-banner');
          const badge = document.getElementById('pro-actions-status-badge');
          const cards = document.querySelectorAll('.pro-card');

          if (total < 50) {
            if (warning) {
              warning.innerText = `${total.toFixed(2)}/50 €, no coupons available`;
              warning.style.display = 'block';
            }
            if (badge) {
              badge.innerText = 'Locked!';
              badge.className = 'pro-actions-subtitle locked';
            }
            selectedProCards.clear();
            cards.forEach(card => {
              card.classList.add('disabled');
              card.classList.remove('selected');
            });
          } else {
            if (warning) {
              warning.style.display = 'none';
            }
            if (badge) {
              badge.innerText = 'Unlocked!';
              badge.className = 'pro-actions-subtitle';
            }
            cards.forEach(card => {
              card.classList.remove('disabled');
            });
          }

          checkEmailAndSync();
        }
      } else {
        const widget = document.getElementById('pro-actions-widget');
        if (widget) widget.classList.remove('active');
        const launcher = document.getElementById('pro-actions-launcher');
        if (launcher) launcher.classList.add('hidden');
      }
    } catch (err) {
      console.warn("checkAndToggleWidget error:", err);
    }
  }

  setInterval(checkAndToggleWidget, 1000);
})();