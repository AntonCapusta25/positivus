-- Alter merchants table to add admin_pin column
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS admin_pin VARCHAR(50) DEFAULT '1234';

-- Create pos_machines table
CREATE TABLE IF NOT EXISTS public.pos_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    merchant_id VARCHAR(100) NOT NULL REFERENCES public.merchants(merchant_id) ON DELETE CASCADE,
    registration_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pos_machines ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON pr.prrelid = c.oid
        JOIN pg_publication p ON pr.prpubid = p.oid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'pos_machines'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_machines;
    END IF;
END $$;

-- Policies for pos_machines
DROP POLICY IF EXISTS "Allow read access for all clients" ON public.pos_machines;
CREATE POLICY "Allow read access for all clients" ON public.pos_machines
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert/write access for all clients" ON public.pos_machines;
CREATE POLICY "Allow insert/write access for all clients" ON public.pos_machines
    FOR ALL USING (true) WITH CHECK (true);
