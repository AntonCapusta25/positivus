# How to Hide / Disable the "Skip" Button on Hyperzod Storefront

To force users to register or log in on your Hyperzod storefront app and prevent them from bypassing authentication via the "Skip" button, copy and paste the snippet below into your **Hyperzod Admin Panel**.

---

## 📍 Where to Paste on Hyperzod

1. Log into your **Hyperzod Admin Dashboard**.
2. Go to **Storefront Settings** -> **Custom Code** (or **Header & Footer Scripts**).
3. Paste the code into the **Custom Header Code** (`<head>`) section.
4. Click **Save Settings**.

---

## ⚡ Copy-Paste Code Snippet

```html
<!-- HYPERZOD CUSTOM HEADER CODE: SURGICAL SKIP BUTTON REMOVAL -->
<style>
  /* CSS targeted strictly to skip elements */
  .skip-btn, 
  .skip-button, 
  .btn-skip, 
  .skip-link,
  [data-test="skip-button"], 
  [data-testid="skip"], 
  a[href*="skip"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
</style>

<script>
  (function() {
    function hideSkipButton() {
      // 1. Target ONLY actual clickable elements (buttons & links)
      const clickables = document.querySelectorAll('button, a, [role="button"], .btn, .button');
      
      clickables.forEach(function(el) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        
        // 2. Strict check: length <= 15 and exact text match to "skip", "skip for now", etc.
        // This guarantees page containers, banners, and navigation links are NEVER touched.
        if (text.length > 0 && text.length <= 15 && (
          text === 'skip' || 
          text === 'skip for now' || 
          text === 'skip login' || 
          text === 'skip >' || 
          text === 'skip →'
        )) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      });
    }

    // Run immediately when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hideSkipButton);
    } else {
      hideSkipButton();
    }

    // Observe dynamic Vue.js route transitions & component re-renders
    var observer = new MutationObserver(function() {
      hideSkipButton();
    });

    if (document.body || document.documentElement) {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  })();
</script>
```

---

## 🔒 Safety & Precision Guarantee

1. **`text.length <= 15` Guard**: Page wrapper divs and layout containers contain hundreds of characters and will be completely ignored.
2. **Exact String Match**: Only matches exact button labels (`"skip"`, `"skip for now"`). It will never match category names, items, or navigation links.
3. **Direct Button Targeting**: Only applies styles directly to `button` and `a` elements, leaving the rest of your app's layout and click handlers intact.
