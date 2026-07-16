# Hyperzod VIP Offers & Coupons Widget Setup

This document explains how to deploy, load, and configure the custom **VIP Offers & Coupons Widget** on your Hyperzod Storefront Checkout page, and how to connect it to your Supabase database.

---

## 1. Hosting the Widget Script
The script has been stored inside the public folder of your POS client project at:
[`web/public/coupon-widget.js`](file:///Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/web/public/coupon-widget.js)

When you deploy your POS client project to Vercel, this script is served statically at:
`https://[YOUR_VERCEL_APP_DOMAIN]/coupon-widget.js`

### How to load it on Hyperzod:
1. Go to your **Hyperzod Admin Panel**.
2. Navigate to **Storefront Settings** -> **Custom Code / Scripts** -> **Custom JavaScript**.
3. Add the script tag pointing to your hosted Vercel file:
   ```html
   <script src="https://[YOUR_VERCEL_APP_DOMAIN]/coupon-widget.js"></script>
   ```
4. Save settings. The widget will now automatically load and inject itself when users navigate to the Checkout page!

---

## 2. Connecting to Supabase Database
To dynamically pull active coupons from your Supabase database instead of using the hardcoded default array, follow these steps:

### Step 1: Create a Coupons Table in Supabase
Run the following SQL in your **Supabase Dashboard SQL Editor** to create the coupons database schema:

```sql
-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,      -- The discount code (e.g. mango_free, priority_del)
    title VARCHAR(100) NOT NULL,          -- Title shown on card (e.g. Free Mango Lassi)
    discount_label VARCHAR(50) DEFAULT 'Select', -- Under text (e.g. Select, -€5.00, Free)
    image_url TEXT,                        -- Image URL to show on card
    is_active BOOLEAN DEFAULT true,       -- Show/Hide toggle
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Read-only for public, write-only for service)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to active coupons" 
ON public.coupons FOR SELECT USING (is_active = true);
```

### Step 2: Populate Coupons
Insert a few starting coupons into the database:
```sql
INSERT INTO public.coupons (code, title, discount_label, image_url, is_active) VALUES
('priority_del', 'Free Priority Delivery', 'Select', 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80', true),
('ten_off', '10% Off Next Order', 'Select', 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80', true),
('mango_free', 'Free Mango Lassi', 'Select', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80', true);
```

### Step 3: Activate Supabase Fetch in Script
1. Open [`web/public/coupon-widget.js`](file:///Users/alexandrfilippov/.gemini/antigravity-ide/scratch/spoonful-pos/web/public/coupon-widget.js).
2. Go to line **42** where `fetchLiveCoupons` is defined.
3. Uncomment the `fetchLiveCoupons` block and replace:
   - `[YOUR_SUPABASE_PROJECT]` with your actual Supabase project ID.
   - `[YOUR_SUPABASE_ANON_KEY]` with your project's anonymous public api key.
4. Uncomment line **73** (`await fetchLiveCoupons();`) inside the `initPremiumWidget()` block.
5. Push the updates to GitHub/Vercel. The checkout widget is now fully connected to your Supabase database in real time!
