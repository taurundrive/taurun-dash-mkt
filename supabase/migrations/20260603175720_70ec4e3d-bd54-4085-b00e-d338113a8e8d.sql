-- Restrict business data to authenticated users only
DROP POLICY IF EXISTS "Public can read cac_monthly" ON public.cac_monthly;
DROP POLICY IF EXISTS "Public can read campaigns_daily" ON public.campaigns_daily;
DROP POLICY IF EXISTS "Public can read sales_monthly" ON public.sales_monthly;
DROP POLICY IF EXISTS "Public read instagram_metrics_daily" ON public.instagram_metrics_daily;

REVOKE SELECT ON public.cac_monthly FROM anon;
REVOKE SELECT ON public.campaigns_daily FROM anon;
REVOKE SELECT ON public.sales_monthly FROM anon;
REVOKE SELECT ON public.instagram_metrics_daily FROM anon;

GRANT SELECT ON public.cac_monthly TO authenticated;
GRANT SELECT ON public.campaigns_daily TO authenticated;
GRANT SELECT ON public.sales_monthly TO authenticated;
GRANT SELECT ON public.instagram_metrics_daily TO authenticated;

CREATE POLICY "Authenticated can read cac_monthly" ON public.cac_monthly
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read campaigns_daily" ON public.campaigns_daily
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read sales_monthly" ON public.sales_monthly
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read instagram_metrics_daily" ON public.instagram_metrics_daily
  FOR SELECT TO authenticated USING (true);

-- Remove tables from Realtime publication to prevent any authenticated user
-- from subscribing to live business-data updates.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.campaigns_daily; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.instagram_metrics_daily; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.cac_monthly; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.sales_monthly; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;