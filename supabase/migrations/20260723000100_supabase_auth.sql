-- Alter merchants table to add owner_id referencing auth.users
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Alter drivers table to add user_id referencing auth.users
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS and define owner-scoped security policies
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Drop legacy simple policies
DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.merchants;
DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.drivers;

-- Re-create public read policies (so POS terminals & public carts can resolve data)
CREATE POLICY "Allow select for all clients" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Allow select for all clients" ON public.drivers FOR SELECT USING (true);

-- Create write/modification policies restricted to owners and authenticated context
CREATE POLICY "Allow insert/update/delete for store owners" 
ON public.merchants FOR ALL 
TO authenticated 
USING (owner_id = auth.uid() OR owner_id IS NULL)
WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Allow insert/update/delete for driver profiles" 
ON public.drivers FOR ALL 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
