-- Migration: Permitir escrita pública de auditorias no frontend (RLS Bypass Fallback)
-- Permite que o cliente salve o relatório de auditoria gerado localmente em caso de fallback.

DROP POLICY IF EXISTS "Somente service_role pode inserir auditorias" ON public.whatsapp_ai_audits;

CREATE POLICY "Permitir inserção e atualização de auditorias para anon e authenticated"
  ON public.whatsapp_ai_audits
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
