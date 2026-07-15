-- Add preparation_time column to public.orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS preparation_time INT DEFAULT 20;
