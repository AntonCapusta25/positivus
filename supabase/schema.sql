-- Database schema for Spoonful POS
-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(50),
    merchant_id VARCHAR(100) NOT NULL DEFAULT 'restaurant_1',
    items JSONB NOT NULL, -- Array of items: [{"name": "Burger", "quantity": 2, "price": 12.50, "notes": "No onions"}]
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'incoming', -- incoming, preparing, ready, completed, cancelled
    type VARCHAR(50) NOT NULL DEFAULT 'dine_in', -- delivery, pickup, dine_in
    payment_method VARCHAR(50) NOT NULL DEFAULT 'online', -- cash, card, online
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, refunded
    notes TEXT,
    printed BOOLEAN NOT NULL DEFAULT FALSE,
    preparation_time INT DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create simple policy to allow all actions for service role / anon client for demonstration
-- In production, restrict to authenticated users or API keys.
DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.orders;
CREATE POLICY "Allow read/write access for all clients" 
ON public.orders 
FOR ALL 
USING (true)
WITH CHECK (true);



-- Create merchants table
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT true,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
    slug VARCHAR(100),
    raw_details JSONB, -- Full merchant object from Hyperzod
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(100) UNIQUE NOT NULL,
    merchant_id VARCHAR(100) NOT NULL REFERENCES public.merchants(merchant_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    category_id VARCHAR(100),
    category_name VARCHAR(100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies to allow read/write access for demonstration
DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.merchants;
CREATE POLICY "Allow read/write access for all clients" 
ON public.merchants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.products;
CREATE POLICY "Allow read/write access for all clients" 
ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for tables (idempotent DO block check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON pr.prrelid = c.oid
        JOIN pg_publication p ON pr.prpubid = p.oid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON pr.prrelid = c.oid
        JOIN pg_publication p ON pr.prpubid = p.oid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'merchants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.merchants;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON pr.prrelid = c.oid
        JOIN pg_publication p ON pr.prpubid = p.oid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
END $$;

-- Create performance indexes for multi-merchant lookups
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products(merchant_id);


-- Create drivers credentials table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id VARCHAR(100) NOT NULL DEFAULT 'restaurant_1',
    name VARCHAR(100) UNIQUE NOT NULL,
    passcode VARCHAR(50) NOT NULL DEFAULT '1234',
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for demonstration
DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.drivers;
CREATE POLICY "Allow read/write access for all clients" 
ON public.drivers FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for drivers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON pr.prrelid = c.oid
        JOIN pg_publication p ON pr.prpubid = p.oid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'drivers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
    END IF;
END $$;

