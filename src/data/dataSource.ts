/**
 * dataSource.ts — Fonte de dados centralizada do dashboard
 *
 * Fontes de dados:
 *   ┌─────────────────────────────┬───────────────────────────────────────────┐
 *   │ Dado                        │ Origem                                     │
 *   ├─────────────────────────────┼───────────────────────────────────────────┤
 *   │ Campanhas (diário)          │ Meta (Facebook) Ads API → direto           │
 *   │ Vendas mensais              │ Supabase · sales_monthly (via Apps Script) │
 *   │ CAC mensal                  │ Supabase · cac_monthly                     │
 *   │ Leads do WhatsApp           │ Supabase · whatsapp_leads (via Z-API)      │
 *   └─────────────────────────────┴───────────────────────────────────────────┘
 *
 * Realtime: Supabase Realtime para sales_monthly, cac_monthly e whatsapp_leads.
 * A Meta API é re-fetched periodicamente (a cada 5 min) via polling simples.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockDashboardData } from "./mockData";
import { fetchMetaCampaigns } from "@/integrations/meta/fetchCampaigns";
import { fetchSheetsSales } from "@/integrations/sheets/fetchSales";
import { fetchSheetsCAC, last8Digits } from "@/integrations/sheets/fetchCac";
import type {
  CampaignType,
  DashboardData,
  MonthlyCacRow,
  SalesPoint,
} from "./types";

// Re-exporta Campaign e DailyCampaignPoint para compatibilidade
export type { Campaign, DailyCampaignPoint } from "./types";

// ── Helpers de data ───────────────────────────────────────────────────────────

function monthLabel(monthIso: string): string {
  // monthIso: yyyy-mm-dd (first day) → "M/yyyy"
  const [y, m] = monthIso.split("-");
  return `${parseInt(m, 10)}/${y}`;
}

// Tipos de objetivo de campanha que entram no cálculo de CPL/investimento de conversas
const CONVERSAS_OBJECTIVES = new Set([
  "outcome_engagement",
  "messages",
  "outcome_messages",
]);

// ── Construção do histórico mensal de CAC ─────────────────────────────────────

function buildCacMonthly(
  cacRows: Array<{
    month: string;
    paid_leads: number | string | null;
    closed_sales: number | string | null;
    leads_closed_sales: number | string | null;
    paid_revenue: number | string | null;
    general_avg_ticket: number | string | null;
  }>,
  // Ainda mantemos o parâmetro para compatibilidade futura (ex: injetar dados de campanhas)
  _campaignsRows?: Array<{
    objetivo: string | null;
    data: string;
    valor_usado: number | string | null;
  }>
): MonthlyCacRow[] {
  return cacRows
    .map((r) => {
      const monthIso = String(r.month).slice(0, 7); // yyyy-mm
      return {
        monthIso,
        label: monthLabel(monthIso),
        invested: 0,        // será sobrescrito após o fetch da Meta
        totalInvested: 0,
        paidLeads: Number(r.paid_leads) || 0,
        closedSales: Number(r.closed_sales) || 0,
        leadsClosedSales: Number(r.leads_closed_sales) || 0,
        paidRevenue: Number(r.paid_revenue) || 0,
        generalAvgTicket: Number(r.general_avg_ticket) || 0,
      } as MonthlyCacRow;
    })
    .sort((a, b) => a.monthIso.localeCompare(b.monthIso));
}

// ── Janela de datas para o fetch da Meta ─────────────────────────────────────
// Busca o range selecionado ou os últimos 60 dias por padrão para manter a query ultrarrápida.

function getMetaDateRange(range?: { start: string; end: string }): { since: string; until: string } {
  if (range && range.start && range.end) {
    return { since: range.start, until: range.end };
  }
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(since), until: fmt(until) };
}

// Cache global e por período (range) em memória para evitar qualquer throttle na navegação
let globalCache: DashboardData | null = null;
const rangeCache = new Map<string, { data: DashboardData; timestamp: number }>();
const RANGE_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos de TTL para requisições idênticas do filtro

function getRangeCacheKey(range?: { start: string; end: string }) {
  return range && range.start && range.end ? `${range.start}_${range.end}` : "default_60";
}

// Cache independente para dados históricos (Sheets e Supabase) que não dependem do filtro de dias (7d/15d/30d)
let historicalCache: {
  salesData: any[];
  cacData: any[];
  leadsData: any[];
  sheetsSales: any;
  sheetsCAC: any;
  timestamp: number;
} | null = null;
let historicalFetchPromise: Promise<any> | null = null;
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 minutos de TTL

async function getHistoricalData() {
  if (historicalCache && Date.now() - historicalCache.timestamp < HISTORICAL_TTL_MS) {
    return historicalCache;
  }
  if (historicalFetchPromise) {
    return historicalFetchPromise;
  }

  historicalFetchPromise = Promise.all([
    supabase.from("sales_monthly").select("month, total_sales").order("month", { ascending: true }),
    supabase.from("cac_monthly").select("month, paid_leads, closed_sales, leads_closed_sales, paid_revenue, general_avg_ticket").order("month", { ascending: true }),
    supabase.from("whatsapp_leads").select("data_lead, telefone").limit(50000),
    fetchSheetsSales(),
    fetchSheetsCAC(),
  ])
    .then(([salesRes, cacRes, leadsRes, sheetsSales, sheetsCAC]) => {
      if (salesRes.error) console.warn("[dataSource] sales_monthly:", salesRes.error.message);
      if (cacRes.error) console.warn("[dataSource] cac_monthly:", cacRes.error.message);
      if (leadsRes.error) console.warn("[dataSource] whatsapp_leads:", leadsRes.error.message);

      const res = {
        salesData: salesRes.data ?? [],
        cacData: cacRes.data ?? [],
        leadsData: leadsRes.data ?? [],
        sheetsSales,
        sheetsCAC,
        timestamp: Date.now(),
      };
      historicalCache = res;
      historicalFetchPromise = null;
      return res;
    })
    .catch((err) => {
      console.error("[dataSource] erro ao buscar dados históricos:", err);
      historicalFetchPromise = null;
      return historicalCache ?? { salesData: [], cacData: [], leadsData: [], sheetsSales: null, sheetsCAC: null, timestamp: 0 };
    });

  return historicalFetchPromise;
}

// ── Função principal de fetch ─────────────────────────────────────────────────

export async function fetchDashboardData(range?: { start: string; end: string }): Promise<DashboardData> {
  const cacheKey = getRangeCacheKey(range);
  const cachedEntry = rangeCache.get(cacheKey);

  // Se o período já foi buscado há menos de 3 minutos, retorna em 0 milissegundos sem consultar rede!
  if (cachedEntry && Date.now() - cachedEntry.timestamp < RANGE_CACHE_TTL_MS) {
    return cachedEntry.data;
  }

  const { since, until } = getMetaDateRange(range);

  // Executa em paralelo: Meta API (única query que depende do range) + dados históricos em cache de 5min
  const [
    metaCampaigns,
    { salesData, cacData, leadsData, sheetsSales, sheetsCAC },
  ] = await Promise.all([
    fetchMetaCampaigns(since, until).catch((err) => {
      console.error("[dataSource] Erro ao buscar campanhas da Meta:", err);
      return globalCache?.campaigns ?? [];
    }),
    getHistoricalData(),
  ]);

  // ── Vendas (SalesPoint[]) ─────────────────────────────────────────────────
  const sales: SalesPoint[] = (salesData ?? []).map((row) => ({
    date: row.month,
    amount: Number(row.total_sales) || 0,
  }));

  // Se houver dados da planilha do Apps Script (Vendas REALIZADO), atualiza ou insere o mês
  if (sheetsSales && sheetsSales.totalVendas > 0) {
    const monthIso = sheetsSales.mesIso || "2026-07-01";
    const idx = sales.findIndex((s) => s.date.slice(0, 7) === monthIso.slice(0, 7));
    if (idx >= 0) {
      sales[idx].amount = sheetsSales.totalVendas;
    } else {
      sales.push({ date: monthIso, amount: sheetsSales.totalVendas });
    }
  }

  // ── Leads do WhatsApp por data e telefone ────────────────────────────────
  const waLeadsByMonth  = new Map<string, number>();   // month → contagem
  const waPhonesByMonth = new Map<string, string[]>(); // month → lista de telefones normalizados
  const waLeadMonthByLast8 = new Map<string, string>(); // last8 → mês de origem ("YYYY-MM")
  const waLeadDates: string[] = [];

  for (const r of (leadsData ?? []) as Array<{ data_lead: string; telefone: string | null }>) {
    const iso      = String(r.data_lead);
    const monthKey = iso.slice(0, 7);

    // Contagem de leads por mês
    waLeadsByMonth.set(monthKey, (waLeadsByMonth.get(monthKey) ?? 0) + 1);
    waLeadDates.push(iso.slice(0, 10));

    // Índice de telefones por mês e mapeamento de mês de origem para Cohort Attribution
    const tel = String(r.telefone ?? "").replace(/\D/g, "");
    if (tel.length >= 8) {
      if (!waPhonesByMonth.has(monthKey)) waPhonesByMonth.set(monthKey, []);
      waPhonesByMonth.get(monthKey)!.push(tel);

      const l8 = last8Digits(tel);
      if (!waLeadMonthByLast8.has(l8)) {
        waLeadMonthByLast8.set(l8, monthKey);
      }
    }
  }

  // ── CAC mensal ────────────────────────────────────────────────────────────
  let cacMonthly: MonthlyCacRow[] =
    cacData && cacData.length > 0
      ? buildCacMonthly(cacData)
      : mockDashboardData.cacMonthly;

  // Substitui paidLeads pelos leads reais do WhatsApp (fonte da verdade)
  for (const row of cacMonthly) {
    const k = row.monthIso.slice(0, 7);
    if (waLeadsByMonth.has(k)) row.paidLeads = waLeadsByMonth.get(k)!;
  }

  // ── Integração com Orçamentos Fechados (Apps Script) ──────────────────────
  // Sobrescreve closedSales e paidRevenue com dados reais da planilha,
  // e calcula leadsClosedSales via matching de últimos 8 dígitos do telefone.
  if (sheetsCAC && sheetsCAC.sucesso && sheetsCAC.meses) {
    const sheetsMeses = sheetsCAC.meses;

    // Garantir que todos os meses da planilha existam em cacMonthly (cria stubs se necessário)
    const existingKeys = new Set(cacMonthly.map((r) => r.monthIso.slice(0, 7)));
    for (const k of Object.keys(sheetsMeses)) {
      if (!existingKeys.has(k)) {
        const [y, m] = k.split("-");
        const monthIso = k;
        cacMonthly.push({
          monthIso,
          label: `${parseInt(m, 10)}/${y}`,
          invested: 0,
          totalInvested: 0,
          paidLeads: waLeadsByMonth.get(k) ?? 0,
          closedSales: 0,
          leadsClosedSales: 0,
          paidRevenue: 0,
          generalAvgTicket: 0,
        });
      }
    }
    cacMonthly.sort((a, b) => a.monthIso.localeCompare(b.monthIso));

    // ── Cohort Attribution: agrupa as vendas e receitas da planilha de acordo com
    // o mês exato em que o lead do WhatsApp foi capturado (mês de origem do lead).
    const cohortMatchesByMonth = new Map<string, number>();
    const cohortRevenueByMonth = new Map<string, number>();

    for (const [sheetMonth, monthData] of Object.entries(sheetsMeses)) {
      if (monthData.items && Array.isArray(monthData.items) && monthData.items.length > 0) {
        for (const item of monthData.items) {
          const itemPhones = item.phones && item.phones.length > 0 ? item.phones : [item.phone];
          let matchedOriginMonth: string | undefined = undefined;

          for (const p of itemPhones) {
            if (p && waLeadMonthByLast8.has(last8Digits(p))) {
              matchedOriginMonth = waLeadMonthByLast8.get(last8Digits(p));
              break;
            }
          }

          // Se encontramos o mês em que o lead entrou, jogamos o crédito da venda e da receita de volta
          // para o mês de origem (Cohort). Se não houver match, ignoramos para não inflar o tráfego pago.
          if (matchedOriginMonth) {
            cohortMatchesByMonth.set(matchedOriginMonth, (cohortMatchesByMonth.get(matchedOriginMonth) ?? 0) + 1);
            cohortRevenueByMonth.set(matchedOriginMonth, (cohortRevenueByMonth.get(matchedOriginMonth) ?? 0) + (item.amount || 0));
          }
        }
      } else {
        // Fallback: se a planilha ainda não retornou itens individuais, faz matching tradicional
        const waPhones   = waPhonesByMonth.get(sheetMonth) ?? [];
        const waLast8Set = new Set(waPhones.map(last8Digits));
        let matches      = 0;
        for (const sp of monthData.phones) {
          if (waLast8Set.has(last8Digits(sp))) matches++;
        }
        if (matches > 0) {
          cohortMatchesByMonth.set(sheetMonth, (cohortMatchesByMonth.get(sheetMonth) ?? 0) + matches);
          cohortRevenueByMonth.set(sheetMonth, (cohortRevenueByMonth.get(sheetMonth) ?? 0) + monthData.paidRevenue);
        }
      }
    }

    // Merge nos meses históricos do dashboard
    for (const row of cacMonthly) {
      const k         = row.monthIso.slice(0, 7);
      const monthData = sheetsMeses[k];

      // closedSales contagem das vendas gerais fechadas na planilha NAQUELE mês de fechamento (visão de caixa)
      row.closedSales = monthData ? monthData.closedSales : 0;

      // leadsClosedSales e paidRevenue são alimentados pela SAFRA DE ORIGEM DO LEAD (Cohort Attribution)
      row.leadsClosedSales = cohortMatchesByMonth.get(k) ?? 0;
      row.paidRevenue      = cohortRevenueByMonth.get(k) ?? 0;
    }
  }

  // Injeta o investimento mensal de campanhas de Conversas (da Meta API)
  // para que o CAC/CPL sejam calculados com dados reais.
  if (metaCampaigns.length > 0) {
    // Agrega investimento por mês apenas para campanhas de conversas
    const investedByMonth = new Map<string, number>();
    const totalInvestedByMonth = new Map<string, number>();

    for (const campaign of metaCampaigns) {
      const isConversas = campaign.type === "Conversas por mensagem iniciadas";
      for (const point of campaign.daily) {
        const monthKey = point.date.slice(0, 7);
        totalInvestedByMonth.set(
          monthKey,
          (totalInvestedByMonth.get(monthKey) ?? 0) + point.invested
        );
        if (isConversas) {
          investedByMonth.set(
            monthKey,
            (investedByMonth.get(monthKey) ?? 0) + point.invested
          );
        }
      }
    }

    // Atualiza invested em cada linha de CAC
    for (const row of cacMonthly) {
      const k = row.monthIso.slice(0, 7);
      row.invested = investedByMonth.get(k) ?? row.invested;
      row.totalInvested = totalInvestedByMonth.get(k) ?? row.totalInvested;
    }
  }


  const result: DashboardData = {
    campaigns: metaCampaigns,
    sales: sales.length ? sales : mockDashboardData.sales,
    cacMonthly,
    waLeadDates,
  };

  rangeCache.set(cacheKey, { data: result, timestamp: Date.now() });
  globalCache = result;
  return result;
}

// ── Hook React com Realtime ───────────────────────────────────────────────────

const META_POLL_INTERVAL_MS = 5 * 60 * 1000; // re-fetch da Meta a cada 5 min

export function useDashboardData(range?: { start: string; end: string }) {
  const [data, setData] = useState<DashboardData | null>(globalCache);
  const [loading, setLoading] = useState(!globalCache);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    if (!globalCache) {
      setLoading(true);
    }

    const loadData = () =>
      fetchDashboardData(range)
        .then((d) => { if (active) { setData(d); setLoading(false); } })
        .catch((err) => console.error("[useDashboardData]", err))
        .finally(() => { if (active) setLoading(false); });

    // Fetch inicial / mudança de range
    loadData();

    // Polling da Meta API a cada 5 min (não tem Realtime disponível)
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      if (active) loadData();
    }, META_POLL_INTERVAL_MS);

    // Realtime do Supabase para vendas, CAC e leads WA
    const channel = supabase
      .channel("dashboard_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_monthly" },
        () => { if (active) loadData(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cac_monthly" },
        () => { if (active) loadData(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_leads" },
        () => { if (active) loadData(); }
      )
      .subscribe();

    return () => {
      active = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      supabase.removeChannel(channel);
    };
  }, [range?.start, range?.end]);

  return { data, loading };
}