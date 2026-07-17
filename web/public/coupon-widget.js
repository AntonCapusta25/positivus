// PREMIUM PRO ACTIONS WIDGET (Standalone Script)
// Copy-paste this script URL into your Hyperzod Storefront Custom JavaScript settings:
// e.g. <script src="https://[YOUR_VERCEL_DOMAIN]/coupon-widget.js"></script>

(function() {
  console.log("Premium Pro Actions Widget Initializing...");

  const SUPABASE_URL = "https://qttdcibitumvwsrxqeld.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGRjaWJpdHVtdndzcnhxZWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUzNSwiZXhwIjoyMDk2ODcwNTM1fQ.JpDFwAdN-kRzhRWSQcfVZVKJjnDfGb1fZ6M52iWP0OA";

  // 1. Inject the Glassmorphism CSS dynamically
  function injectPremiumStyles() {
    if (document.getElementById('premium-widget-css')) return;
    const style = document.createElement('style');
    style.id = 'premium-widget-css';
    style.innerHTML = `
      #pro-actions-widget { margin: 24px 0; padding: 24px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 20px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.5); font-family: 'Inter', -apple-system, sans-serif; position: relative; z-index: 10; display: block !important; opacity: 1 !important; }
      .pro-actions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .pro-actions-title { font-size: 20px; font-weight: 800; background: linear-gradient(135deg, #111, #444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; letter-spacing: -0.5px; }
      .pro-actions-subtitle { font-size: 12px; color: #fff; font-weight: 700; background: linear-gradient(135deg, #01C267, #0B9E56); padding: 6px 12px; border-radius: 20px; box-shadow: 0 4px 10px rgba(1, 194, 103, 0.2); }
      .pro-actions-subtitle.locked { background: #eab308; color: #854d0e; box-shadow: none; }
      .pro-actions-warning { font-size: 13px; color: #854d0e; font-weight: 700; background: #fef9c3; border: 1px solid #eab308; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; text-align: center; line-height: 1.4; }
      .pro-actions-scroll-container { display: flex; overflow-x: auto; gap: 16px; padding: 4px 4px 20px 4px; scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none; }
      .pro-actions-scroll-container::-webkit-scrollbar { display: none; }
      .pro-card { min-width: 150px; max-width: 150px; background: rgba(255, 255, 255, 0.9); border-radius: 16px; padding: 12px; cursor: pointer; border: 1px solid rgba(0, 0, 0, 0.05); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
      .pro-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08); border-color: rgba(1, 194, 103, 0.3); }
      .pro-card.selected { background: #f0fdf4; border-color: #01C267; box-shadow: 0 0 0 1px #01C267, 0 8px 24px rgba(1, 194, 103, 0.15); }
      .pro-card.selected::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 16px; background: radial-gradient(circle at top right, rgba(1, 194, 103, 0.1), transparent 70%); pointer-events: none; }
      .pro-card.selected::after { content: '✓'; position: absolute; top: 10px; right: 10px; background: #01C267; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; box-shadow: 0 2px 8px rgba(1, 194, 103, 0.3); }
      .pro-card.disabled { opacity: 0.4; pointer-events: none !important; filter: grayscale(100%); cursor: not-allowed; }
      .pro-card-img { width: 100%; height: 90px; border-radius: 10px; object-fit: cover; margin-bottom: 12px; background: #f5f5f5; transition: transform 0.3s ease; }
      .pro-card:hover .pro-card-img { transform: scale(1.03); }
      .pro-card-title { font-size: 14px; font-weight: 700; color: #111; margin: 0 0 6px 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .pro-card-price { font-size: 13px; font-weight: 800; color: #01C267; margin: 0; }
    `;
    document.head.appendChild(style);
  }

  const MAX_SELECTIONS = 3;
  const selectedProCards = new Set();

  let PRO_ACTIONS = [
    { id: "coupon_1", title: "Free Priority Delivery", price: "Select", image: "https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80" },
    { id: "coupon_2", title: "10% Off Next Order", price: "Select", image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" },
    { id: "coupon_3", title: "Free Mango Lassi", price: "Select", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80" },
    { id: "coupon_4", title: "Chef's Secret Sauce", price: "Select", image: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=400&q=80" }
  ];

  function getCartTotal() {
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
    const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelector('input[placeholder*="email" i]');
    const currentEmail = emailInput ? emailInput.value.trim() : "";
    const currentCouponsStr = Array.from(selectedProCards).join(",");

    if (currentEmail && currentEmail.includes('@')) {
      if (currentEmail !== lastSyncedEmail || currentCouponsStr !== lastSyncedCouponsStr) {
        lastSyncedEmail = currentEmail;
        lastSyncedCouponsStr = currentCouponsStr;
        upsertSelectedCoupons(currentEmail, Array.from(selectedProCards));
      }
    }
  }

  function initPremiumWidget() {
    if (document.getElementById('pro-actions-widget')) return;
    
    injectPremiumStyles();

    const widget = document.createElement('div');
    widget.id = 'pro-actions-widget';

    const header = document.createElement('div');
    header.className = 'pro-actions-header';
    header.innerHTML = `
      <h3 class="pro-actions-title">Unlock VIP Offers ✨</h3>
      <span class="pro-actions-subtitle" id="pro-actions-status-badge">Unlocked!</span>
    `;
    widget.appendChild(header);

    // Warning Banner Container (yellow box)
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
        // Disable selection if total < 50
        const total = getCartTotal();
        if (total < 50) return;

        if (selectedProCards.has(action.id)) {
          selectedProCards.delete(action.id);
          card.classList.remove('selected');
        } else {
          if (selectedProCards.size >= MAX_SELECTIONS) return;
          selectedProCards.add(action.id);
          card.classList.add('selected');
          console.log("Selected Coupons:", Array.from(selectedProCards));
        }
        checkEmailAndSync();
      });

      scrollContainer.appendChild(card);
    });

    widget.appendChild(scrollContainer);

    // Inject into checkout page DOM structure
    const cartCard = document.getElementById('CartCard');
    const checkout = document.getElementById('checkout');

    if (cartCard) {
        cartCard.appendChild(widget);
    } else if (checkout) {
        // Append to checkout container so it sits at the bottom rather than top, preventing overlaps!
        checkout.appendChild(widget);
    } else {
        document.body.appendChild(widget);
    }
  }

  function isCartEmpty() {
    const text = (document.body.innerText || "").toLowerCase();
    return text.includes("once you add items") || 
           text.includes("cart is empty") || 
           text.includes("winkelwagen is leeg") ||
           text.includes("winkelwagen leeg");
  }

  // Polling check to ensure it injects and toggles dynamically as cart updates
  function checkAndToggleWidget() {
    const hasCartCard = document.getElementById('CartCard') !== null;
    const hasCheckout = document.getElementById('checkout') !== null;
    const isCartOrCheckoutPage = hasCartCard || hasCheckout || window.location.pathname.includes('checkout') || window.location.pathname.includes('cart');
    
    if (isCartOrCheckoutPage) {
      if (isCartEmpty()) {
        const widget = document.getElementById('pro-actions-widget');
        if (widget) {
          widget.style.display = 'none';
        }
      } else {
        const widget = document.getElementById('pro-actions-widget');
        if (widget) {
          widget.style.display = 'block';
        } else {
          initPremiumWidget();
        }

        // Live Total Check and UI update
        const total = getCartTotal();
        const warning = document.getElementById('pro-actions-warning-banner');
        const badge = document.getElementById('pro-actions-status-badge');
        const cards = document.querySelectorAll('.pro-card');

        if (total < 50) {
          // Locked State
          if (warning) {
            warning.innerText = `${total.toFixed(2)}/50 €, no coupons available`;
            warning.style.display = 'block';
          }
          if (badge) {
            badge.innerText = 'Locked!';
            badge.className = 'pro-actions-subtitle locked';
          }
          // Clear current selections
          selectedProCards.clear();
          cards.forEach(card => {
            card.classList.add('disabled');
            card.classList.remove('selected');
          });
        } else {
          // Unlocked State
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

        // Poll email for changes and sync
        checkEmailAndSync();
      }
    } else {
      const widget = document.getElementById('pro-actions-widget');
      if (widget) {
        widget.style.display = 'none';
      }
    }
  }

  setInterval(checkAndToggleWidget, 1000);
})();