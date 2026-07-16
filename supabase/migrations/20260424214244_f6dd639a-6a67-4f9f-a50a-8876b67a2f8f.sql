-- 1. Deduplicar: manter apenas a linha mais recente por (campanha, data)
DELETE FROM public.campaigns_daily a
USING public.campaigns_daily b
WHERE a.campanha = b.campanha
  AND a.data = b.data
  AND a.created_at < b.created_at;

-- 2. Garantir unicidade para upserts futuros
ALTER TABLE public.campaigns_daily
  ADD CONSTRAINT campaigns_daily_campanha_data_key UNIQUE (campanha, data);