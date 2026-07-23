-- Migration to automatically generate registration codes for pos_machines on insertion if not specified
CREATE OR REPLACE FUNCTION public.generate_pos_registration_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_code IS NULL OR NEW.registration_code = '' THEN
    NEW.registration_code := 'POS-' || floor(100000 + random() * 900000)::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_pos_registration_code ON public.pos_machines;
CREATE TRIGGER trigger_generate_pos_registration_code
BEFORE INSERT ON public.pos_machines
FOR EACH ROW
EXECUTE FUNCTION public.generate_pos_registration_code();
