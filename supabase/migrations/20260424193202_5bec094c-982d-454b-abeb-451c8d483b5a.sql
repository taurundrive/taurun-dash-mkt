-- Tabela com o total de vendas por mês
CREATE TABLE public.sales_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  total_sales numeric NOT NULL DEFAULT 0,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read sales_monthly"
ON public.sales_monthly
FOR SELECT
USING (true);

CREATE INDEX idx_sales_monthly_month ON public.sales_monthly(month DESC);
