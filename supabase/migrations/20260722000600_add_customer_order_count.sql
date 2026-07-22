-- Add customer_order_count column to orders table to track how many orders a customer has made
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_order_count INT DEFAULT 1;
