-- Migration: Tabela de Auditorias de IA (Gemini) para conversas de WhatsApp
-- Armazena notas, diagnósticos e relatórios gerados pela Inteligência Artificial.

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_audits (
  id              TEXT PRIMARY KEY, -- formato: "phone_vendor_date" (ex: "5511999999999_Roberto_2026-07-16")
  phone           TEXT NOT NULL,
  vendor          TEXT NOT NULL,
  score           NUMERIC(3,1) NOT NULL, -- Nota 0.0 a 10.0
  status_general  TEXT NOT NULL,         -- Ex: Crítico, Regular, Excelente
  report_markdown TEXT NOT NULL,         -- Relatório completo formatado em Markdown
  audited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_ai_json     JSONB                  -- Dados estruturados extras
);

CREATE INDEX IF NOT EXISTS idx_wa_ai_audits_phone_vendor ON public.whatsapp_ai_audits (phone, vendor);
CREATE INDEX IF NOT EXISTS idx_wa_ai_audits_audited_at ON public.whatsapp_ai_audits (audited_at DESC);

ALTER TABLE public.whatsapp_ai_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de auditorias" ON public.whatsapp_ai_audits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Somente service_role pode inserir auditorias" ON public.whatsapp_ai_audits FOR ALL TO service_role USING (true) WITH CHECK (true);
