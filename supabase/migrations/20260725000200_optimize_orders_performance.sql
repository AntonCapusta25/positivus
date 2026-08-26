-- 1. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- 2. Create trigger to calculate customer order count automatically
CREATE OR REPLACE FUNCTION calculate_customer_order_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone <> '' THEN
    SELECT COUNT(*) + 1 INTO NEW.customer_order_count
    FROM orders
    WHERE customer_phone = NEW.customer_phone;
  ELSIF NEW.customer_name IS NOT NULL AND NEW.customer_name <> '' THEN
    SELECT COUNT(*) + 1 INTO NEW.customer_order_count
    FROM orders
    WHERE customer_name = NEW.customer_name;
  ELSE
    NEW.customer_order_count := 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_calculate_customer_order_count
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_customer_order_count();
