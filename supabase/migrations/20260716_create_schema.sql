-- ==============================================================================
-- TAURUN MKT DASHBOARD - ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE POSTGRES)
-- ==============================================================================
-- Execute este script inteiro no SQL Editor do novo projeto Supabase
-- ==============================================================================

-- Habilitar extensão para geração de UUID se não estiver ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABELA: whatsapp_leads (Leads capturados via webhook da Z-API / Tráfego Pago)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NULL,
  telefone TEXT NULL,
  mensagem TEXT NULL,
  data_lead TIMESTAMPTZ NOT NULL,
  vendedor TEXT NULL,
  source TEXT NOT NULL DEFAULT 'z-api',
  raw JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance nas consultas do Dashboard de Leads
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_data_lead ON public.whatsapp_leads (data_lead DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_vendedor ON public.whatsapp_leads (vendedor);

-- ==============================================================================
-- 2. TABELA: cac_monthly (Base mensal de CAC & Performance Paga)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cac_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE, -- Formato ISO: 'YYYY-MM'
  paid_leads NUMERIC NOT NULL DEFAULT 0,
  closed_sales NUMERIC NOT NULL DEFAULT 0,
  paid_revenue NUMERIC NOT NULL DEFAULT 0,
  general_avg_ticket NUMERIC NOT NULL DEFAULT 0,
  leads_closed_sales NUMERIC NOT NULL DEFAULT 0,
  source TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cac_monthly_month ON public.cac_monthly (month DESC);

-- ==============================================================================
-- 3. TABELA: campaigns_daily (Histórico de campanhas de anúncios Meta Ads)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TEXT NOT NULL, -- Formato ISO: 'YYYY-MM-DD'
  campanha TEXT NOT NULL,
  valor_usado NUMERIC NOT NULL DEFAULT 0,
  cliques INTEGER NOT NULL DEFAULT 0,
  resultado INTEGER NOT NULL DEFAULT 0,
  custo_por_clique NUMERIC NOT NULL DEFAULT 0,
  objetivo TEXT NULL,
  range_start TEXT NULL,
  range_end TEXT NULL,
  batch_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_daily_data ON public.campaigns_daily (data DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_daily_campanha ON public.campaigns_daily (campanha);

-- ==============================================================================
-- 4. TABELA: instagram_metrics_daily (Métricas orgânicas diárias do Instagram)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL UNIQUE, -- Formato ISO: 'YYYY-MM-DD'
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  website_clicks INTEGER NOT NULL DEFAULT 0,
  followers INTEGER NOT NULL DEFAULT 0,
  posts_published INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_metrics_daily_date ON public.instagram_metrics_daily (date DESC);

-- ==============================================================================
-- 5. TABELA: sales_monthly (Vendas totais realizadas consolidadas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sales_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE, -- Formato ISO: 'YYYY-MM'
  total_sales NUMERIC NOT NULL DEFAULT 0,
  source TEXT NULL DEFAULT 'apps_script',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_monthly_month ON public.sales_monthly (month DESC);

-- ==============================================================================
-- 6. SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ==============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cac_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_monthly ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_leads
CREATE POLICY "Permitir leitura pública ou de autenticados no whatsapp_leads"
  ON public.whatsapp_leads FOR SELECT USING (true);

CREATE POLICY "Permitir inserção apenas para autenticados ou service_role"
  ON public.whatsapp_leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização apenas para autenticados"
  ON public.whatsapp_leads FOR UPDATE TO authenticated USING (true);

-- Políticas para cac_monthly
CREATE POLICY "Permitir leitura total no cac_monthly"
  ON public.cac_monthly FOR SELECT USING (true);
CREATE POLICY "Permitir escrita apenas para autenticados"
  ON public.cac_monthly FOR ALL TO authenticated USING (true);

-- Políticas para campaigns_daily
CREATE POLICY "Permitir leitura total no campaigns_daily"
  ON public.campaigns_daily FOR SELECT USING (true);
CREATE POLICY "Permitir escrita apenas para autenticados"
  ON public.campaigns_daily FOR ALL TO authenticated USING (true);

-- Políticas para instagram_metrics_daily
CREATE POLICY "Permitir leitura total no instagram_metrics_daily"
  ON public.instagram_metrics_daily FOR SELECT USING (true);
CREATE POLICY "Permitir escrita apenas para autenticados"
  ON public.instagram_metrics_daily FOR ALL TO authenticated USING (true);

-- Políticas para sales_monthly
CREATE POLICY "Permitir leitura total no sales_monthly"
  ON public.sales_monthly FOR SELECT USING (true);
CREATE POLICY "Permitir escrita apenas para autenticados"
  ON public.sales_monthly FOR ALL TO authenticated USING (true);

-- ==============================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ==============================================================================
