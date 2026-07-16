// PREMIUM PRO ACTIONS WIDGET (Standalone Script)
// Copy-paste this script URL into your Hyperzod Storefront Custom JavaScript settings:
// e.g. <script src="https://[YOUR_VERCEL_DOMAIN]/coupon-widget.js"></script>

(function() {
  console.log("Premium Pro Actions Widget Initializing...");

  // 1. Inject the Glassmorphism CSS dynamically
  function injectPremiumStyles() {
    if (document.getElementById('premium-widget-css')) return;
    const style = document.createElement('style');
    style.id = 'premium-widget-css';
    style.innerHTML = `
      #pro-actions-widget { margin: 24px 0; padding: 24px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 20px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.5); font-family: 'Inter', -apple-system, sans-serif; position: relative; z-index: 9999; display: block !important; opacity: 1 !important; }
      .pro-actions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .pro-actions-title { font-size: 20px; font-weight: 800; background: linear-gradient(135deg, #111, #444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; letter-spacing: -0.5px; }
      .pro-actions-subtitle { font-size: 12px; color: #fff; font-weight: 700; background: linear-gradient(135deg, #01C267, #0B9E56); padding: 6px 12px; border-radius: 20px; box-shadow: 0 4px 10px rgba(1, 194, 103, 0.2); }
      .pro-actions-scroll-container { display: flex; overflow-x: auto; gap: 16px; padding: 4px 4px 20px 4px; scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none; }
      .pro-actions-scroll-container::-webkit-scrollbar { display: none; }
      .pro-card { min-width: 150px; max-width: 150px; background: rgba(255, 255, 255, 0.9); border-radius: 16px; padding: 12px; cursor: pointer; border: 1px solid rgba(0, 0, 0, 0.05); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
      .pro-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08); border-color: rgba(1, 194, 103, 0.3); }
      .pro-card.selected { background: #f0fdf4; border-color: #01C267; box-shadow: 0 0 0 1px #01C267, 0 8px 24px rgba(1, 194, 103, 0.15); }
      .pro-card.selected::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 16px; background: radial-gradient(circle at top right, rgba(1, 194, 103, 0.1), transparent 70%); pointer-events: none; }
      .pro-card.selected::after { content: '✓'; position: absolute; top: 10px; right: 10px; background: #01C267; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; box-shadow: 0 2px 8px rgba(1, 194, 103, 0.3); }
      .pro-card-img { width: 100%; height: 90px; border-radius: 10px; object-fit: cover; margin-bottom: 12px; background: #f5f5f5; transition: transform 0.3s ease; }
      .pro-card:hover .pro-card-img { transform: scale(1.03); }
      .pro-card-title { font-size: 14px; font-weight: 700; color: #111; margin: 0 0 6px 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .pro-card-price { font-size: 13px; font-weight: 800; color: #01C267; margin: 0; }
    `;
    document.head.appendChild(style);
  }

  const MAX_SELECTIONS = 3;
  const selectedProCards = new Set();

  // Static fallback coupons
  let PRO_ACTIONS = [
    { id: "coupon_1", title: "Free Priority Delivery", price: "Select", image: "https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80" },
    { id: "coupon_2", title: "10% Off Next Order", price: "Select", image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" },
    { id: "coupon_3", title: "Free Mango Lassi", price: "Select", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80" },
    { id: "coupon_4", title: "Chef's Secret Sauce", price: "Select", image: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=400&q=80" }
  ];

  // OPTIONAL: Fetch live coupons from Supabase
  /*
  const SUPABASE_URL = "https://[YOUR_SUPABASE_PROJECT].supabase.co";
  const ANON_KEY = "[YOUR_SUPABASE_ANON_KEY]";

  async function fetchLiveCoupons() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/coupons?select=*&is_active=eq.true`, {
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          PRO_ACTIONS = data.map(item => ({
            id: item.code, // Coupon code
            title: item.title || item.name,
            price: item.discount_label || "Select",
            image: item.image_url || "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80"
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to load live coupons from Supabase. Falling back to default list.", e);
    }
  }
  */

  async function initPremiumWidget() {
    if (document.getElementById('pro-actions-widget')) return;
    
    // Uncomment below if you connect to Supabase:
    // await fetchLiveCoupons();

    injectPremiumStyles();

    const widget = document.createElement('div');
    widget.id = 'pro-actions-widget';

    const header = document.createElement('div');
    header.className = 'pro-actions-header';
    header.innerHTML = `
      <h3 class="pro-actions-title">Unlock VIP Offers ✨</h3>
      <span class="pro-actions-subtitle">Unlocked!</span>
    `;
    widget.appendChild(header);

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
        if (selectedProCards.has(action.id)) {
          selectedProCards.delete(action.id);
          card.classList.remove('selected');
        } else {
          if (selectedProCards.size >= MAX_SELECTIONS) return;
          selectedProCards.add(action.id);
          card.classList.add('selected');
          console.log("Selected Coupons:", Array.from(selectedProCards));
          
          // Trigger applying coupon to Hyperzod's checkout order if desired
          // applyCouponToHyperzod(action.id);
        }
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
        checkout.insertBefore(widget, checkout.firstChild);
    } else {
        document.body.appendChild(widget);
    }
  }

  // Polling check to ensure it injects even after SPA/Vue routing transitions
  function checkAndToggleWidget() {
    const isCheckoutDom = document.getElementById('checkout') !== null;
    const isCheckoutUrl = window.location.pathname.includes('checkout');
    
    if (isCheckoutDom || isCheckoutUrl) {
      initPremiumWidget();
    }
  }

  setInterval(checkAndToggleWidget, 1000);
})();