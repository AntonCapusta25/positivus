-- Add driver_name and delivery_duration to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_duration INT DEFAULT 15;
