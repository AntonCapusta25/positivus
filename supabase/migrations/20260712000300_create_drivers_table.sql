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
