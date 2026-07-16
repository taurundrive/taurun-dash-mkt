
CREATE TABLE public.whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  telefone text,
  mensagem text,
  data_lead timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  source text NOT NULL DEFAULT 'n8n-zapi',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_leads TO authenticated;
GRANT ALL ON public.whatsapp_leads TO service_role;

ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read whatsapp_leads"
  ON public.whatsapp_leads FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX whatsapp_leads_data_lead_idx ON public.whatsapp_leads (data_lead DESC);
CREATE INDEX whatsapp_leads_telefone_idx ON public.whatsapp_leads (telefone);
