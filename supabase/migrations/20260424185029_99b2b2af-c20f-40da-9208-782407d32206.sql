-- Campaigns daily performance data ingested from n8n
CREATE TABLE public.campaigns_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha TEXT NOT NULL,
  objetivo TEXT,
  data DATE NOT NULL,
  resultado NUMERIC NOT NULL DEFAULT 0,
  cliques NUMERIC NOT NULL DEFAULT 0,
  valor_usado NUMERIC NOT NULL DEFAULT 0,
  custo_por_clique NUMERIC NOT NULL DEFAULT 0,
  range_start DATE,
  range_end DATE,
  batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_daily_data ON public.campaigns_daily (data);
CREATE INDEX idx_campaigns_daily_campanha ON public.campaigns_daily (campanha);
CREATE INDEX idx_campaigns_daily_batch ON public.campaigns_daily (batch_id);

ALTER TABLE public.campaigns_daily ENABLE ROW LEVEL SECURITY;

-- Public read (internal dashboard without auth)
CREATE POLICY "Public can read campaigns_daily"
  ON public.campaigns_daily
  FOR SELECT
  USING (true);

-- Inserts only via edge function (uses service role, bypasses RLS).
-- No insert policy = no direct inserts from client.
