-- Migration: cria tabela de mensagens WhatsApp capturadas via webhook Z-API
-- Usada pelo projeto taurun-lead-audit para armazenar histórico real de conversas.

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id              TEXT PRIMARY KEY,          -- messageId único da Z-API
  vendor          TEXT NOT NULL,             -- 'Roberto' ou 'Fernando'
  phone           TEXT NOT NULL,             -- número do lead (sem @c.us)
  chat_name       TEXT,                      -- nome do contato salvo no WhatsApp
  from_me         BOOLEAN NOT NULL,          -- true = vendedor enviou | false = lead enviou
  message_type    TEXT NOT NULL DEFAULT 'text', -- text, image, audio, video, document, sticker, etc
  message_text    TEXT,                      -- conteúdo textual da mensagem
  media_url       TEXT,                      -- URL de mídia (imagem, áudio, vídeo)
  file_name       TEXT,                      -- nome do arquivo (para documentos)
  sent_at         TIMESTAMPTZ NOT NULL,      -- timestamp real da mensagem (campo momment da Z-API)
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- quando o webhook chegou no Supabase
  raw_payload     JSONB                      -- payload completo da Z-API para auditoria futura
);

-- Índices para buscas rápidas por phone e vendedor
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone     ON public.whatsapp_messages (phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_vendor    ON public.whatsapp_messages (vendor);
CREATE INDEX IF NOT EXISTS idx_wa_messages_sent_at   ON public.whatsapp_messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_vendor ON public.whatsapp_messages (phone, vendor, sent_at DESC);

-- RLS: leitura pública (anon) para o frontend, escrita apenas via service_role (Edge Function)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de mensagens"
  ON public.whatsapp_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Somente service_role pode inserir"
  ON public.whatsapp_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE public.whatsapp_messages IS
  'Histórico de mensagens WhatsApp capturadas em tempo real via webhook Z-API (Roberto e Fernando). Projeto: taurun-lead-audit.';
