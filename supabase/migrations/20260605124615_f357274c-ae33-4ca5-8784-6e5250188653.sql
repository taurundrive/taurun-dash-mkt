
ALTER TABLE public.whatsapp_leads
  ADD COLUMN vendedor text;

CREATE INDEX whatsapp_leads_vendedor_idx ON public.whatsapp_leads (vendedor);
