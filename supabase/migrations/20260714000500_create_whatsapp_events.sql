-- Create whatsapp_events table to log raw WhatsApp webhook payloads
CREATE TABLE IF NOT EXISTS public.whatsapp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for all clients for development and webhook logging
DROP POLICY IF EXISTS "Allow read/write access for all clients" ON public.whatsapp_events;
CREATE POLICY "Allow read/write access for all clients" 
ON public.whatsapp_events 
FOR ALL 
USING (true)
WITH CHECK (true);
