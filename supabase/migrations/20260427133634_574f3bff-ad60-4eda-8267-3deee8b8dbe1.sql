CREATE TABLE public.cac_monthly (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month date NOT NULL UNIQUE,
  paid_leads numeric NOT NULL DEFAULT 0,
  closed_sales numeric NOT NULL DEFAULT 0,
  leads_closed_sales numeric NOT NULL DEFAULT 0,
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cac_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read cac_monthly"
ON public.cac_monthly
FOR SELECT
USING (true);

CREATE INDEX idx_cac_monthly_month ON public.cac_monthly(month);