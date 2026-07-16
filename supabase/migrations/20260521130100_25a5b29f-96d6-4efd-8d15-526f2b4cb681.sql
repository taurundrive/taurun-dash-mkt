ALTER TABLE public.cac_monthly
  ADD COLUMN IF NOT EXISTS paid_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS general_avg_ticket numeric NOT NULL DEFAULT 0;