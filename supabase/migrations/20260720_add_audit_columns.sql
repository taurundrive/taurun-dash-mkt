-- Migration: Adicionar novas colunas estruturadas na tabela whatsapp_ai_audits
-- Estas colunas refletem as melhorias recentes da auditoria da IA (Resumo, Tráfego Pago, Follow-up).

ALTER TABLE public.whatsapp_ai_audits
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_reason TEXT,
ADD COLUMN IF NOT EXISTS is_paid_traffic BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_traffic_phrase TEXT;
