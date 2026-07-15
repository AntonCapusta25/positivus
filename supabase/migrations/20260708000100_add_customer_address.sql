-- Add customer_address column to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
