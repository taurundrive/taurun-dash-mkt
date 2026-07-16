import { Campaign, DashboardData, MonthlyCacRow } from "@/data/types";

export interface CampaignAggregate {
  id: string;
  name: string;
  type: Campaign["type"];
  clicks: number;
  leads: number;
  invested: number;
  cpl: number; // cost per lead
  conversion: number | null; // % leads/clicks — null para tipos que não são "Conversas por mensagem iniciadas"
  computesRoas: boolean; // true apenas para campanhas de Conversas (entram no ROAS/CAC)
}

export interface PerformanceTotals {
  campaignsCount: number;
  totalLeads: number;
  totalLeadsConversation: number;
  totalLeadsBranding: number;
  totalInvested: number;
  totalInvestedComputed: number; // só campanhas que entram no ROAS
  totalInvestedBranding: number; // tráfego, alcance, etc.
  cpl: number;
  conversion: number | null;
  totalSales: number;
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

const CONVERSION_TYPE: Campaign["type"] = "Conversas por mensagem iniciadas";

export function aggregateCampaigns(
  data: DashboardData,
  range: { start: string; end: string },
): CampaignAggregate[] {
  return data.campaigns
    .map((c) => {
      const slice = c.daily.filter((d) => inRange(d.date, range.start, range.end));
      const clicks = slice.reduce((s, d) => s + d.clicks, 0);
      const leads = slice.reduce((s, d) => s + d.leads, 0);
      const invested = slice.reduce((s, d) => s + d.invested, 0);
      const cpl = leads > 0 ? invested / leads : 0;
      const conversion =
        c.type === CONVERSION_TYPE && clicks > 0 ? (leads / clicks) * 100 : null;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        clicks,
        leads,
        invested,
        cpl,
        conversion,
        computesRoas: c.type === CONVERSION_TYPE,
      };
    })
    .filter((c) => c.clicks > 0 || c.leads > 0 || c.invested > 0);
}

export function performanceTotals(
  data: DashboardData,
  range: { start: string; end: string },
): PerformanceTotals {
  const aggs = aggregateCampaigns(data, range);
  const computed = aggs.filter((c) => c.computesRoas);
  const branding = aggs.filter((c) => !c.computesRoas);
  // Leads de conversa = leads reais do WhatsApp (fonte da verdade), no período
  const waLeads = (data.waLeadDates ?? []).filter((d) => inRange(d, range.start, range.end));
  const totalLeadsConversation = waLeads.length;
  const totalLeadsBranding = branding.reduce((s, c) => s + c.leads, 0);
  const totalLeads = totalLeadsConversation + totalLeadsBranding;
  const totalInvestedComputed = computed.reduce((s, c) => s + c.invested, 0);
  const totalInvestedBranding = branding.reduce((s, c) => s + c.invested, 0);
  const totalInvested = totalInvestedComputed + totalInvestedBranding;
  // Conversão geral: considerar apenas campanhas de "Conversas por mensagem iniciadas"
  const convAggs = computed;
  const convClicks = convAggs.reduce((s, c) => s + c.clicks, 0);
  const convLeads = convAggs.reduce((s, c) => s + c.leads, 0);
  const totalSales = data.sales
    .filter((s) => {
      const d = s.date.slice(0, 7);
      return d >= range.start.slice(0, 7) && d <= range.end.slice(0, 7);
    })
    .reduce((s, p) => s + p.amount, 0);
  return {
    campaignsCount: aggs.length,
    totalLeads,
    totalLeadsConversation,
    totalLeadsBranding,
    totalInvested,
    totalInvestedComputed,
    totalInvestedBranding,
    cpl: totalLeadsConversation > 0 ? totalInvestedComputed / totalLeadsConversation : 0,
    conversion: convClicks > 0 ? (convLeads / convClicks) * 100 : null,
    totalSales,
  };
}

export interface CacRowComputed extends MonthlyCacRow {
  cac: number | null; // null when no sales (avoid #DIV/0)
}

export function computeCacRows(rows: MonthlyCacRow[]): CacRowComputed[] {
  return rows.map((r) => ({
    ...r,
    cac: r.closedSales > 0 ? r.invested / r.closedSales : null,
  }));
}

// =====================================================================
// Paid traffic indicators (matches the 6 KPIs from the CAC spreadsheet)
// =====================================================================

export type IndicatorStatus = "excellent" | "good" | "warning" | "critical" | "neutral";

const STATUS_COLOR: Record<IndicatorStatus, string> = {
  excellent: "hsl(var(--success))",
  good: "hsl(217 91% 60%)",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
  neutral: "hsl(var(--muted-foreground))",
};

const STATUS_LABEL: Record<IndicatorStatus, string> = {
  excellent: "Excelente",
  good: "Bom",
  warning: "Atenção",
  critical: "Crítico",
  neutral: "Sem dados",
};

export interface PaidIndicator {
  key: "roas" | "cost_revenue" | "cac" | "conversion" | "cpl" | "ticket";
  title: string;
  formula: string;
  benchmark: string;
  value: number | null;
  display: string;
  status: IndicatorStatus;
  statusLabel: string;
  color: string;
}

export interface PaidIndicatorsSet {
  roas: PaidIndicator;
  costRevenue: PaidIndicator;
  cac: PaidIndicator;
  conversion: PaidIndicator;
  cpl: PaidIndicator;
  ticket: PaidIndicator;
}

function fmtBrl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

function build(
  base: Omit<PaidIndicator, "status" | "statusLabel" | "color" | "display"> & {
    display: string;
    status: IndicatorStatus;
  },
): PaidIndicator {
  return {
    ...base,
    statusLabel: STATUS_LABEL[base.status],
    color: STATUS_COLOR[base.status],
  };
}

const NEUTRAL = "neutral" as const;

export function computePaidIndicators(row: MonthlyCacRow | null | undefined): PaidIndicatorsSet {
  const invested = row?.invested ?? 0;
  const leads = row?.paidLeads ?? 0;
  const sales = (row?.leadsClosedSales !== undefined) ? row.leadsClosedSales : (row?.closedSales ?? 0);
  const revenue = row?.paidRevenue ?? 0;
  const generalTicket = row?.generalAvgTicket ?? 0;

  // 1. ROAS pago
  const roasVal = invested > 0 && revenue > 0 ? revenue / invested : null;
  const roasStatus: IndicatorStatus = roasVal === null
    ? NEUTRAL
    : roasVal > 10 ? "excellent" : roasVal >= 6 ? "good" : "warning";

  // 2. Custo de mídia / receita paga (%)
  const costRevVal = revenue > 0 ? (invested / revenue) * 100 : null;
  const costRevStatus: IndicatorStatus = costRevVal === null
    ? NEUTRAL
    : costRevVal < 10 ? "excellent"
    : costRevVal <= 15 ? "good"
    : costRevVal <= 20 ? "warning" : "critical";

  // 3. CAC pago (R$). Avaliado contra ticket médio pago do mês: bom <= 8% do ticket, excelente <=5%
  const paidTicket = sales > 0 ? revenue / sales : 0;
  const cacVal = sales > 0 ? invested / sales : null;
  let cacStatus: IndicatorStatus = NEUTRAL;
  if (cacVal !== null && paidTicket > 0) {
    const pct = (cacVal / paidTicket) * 100;
    cacStatus = pct <= 5 ? "excellent"
      : pct <= 8 ? "good"
      : pct <= 12 ? "warning" : "critical";
  } else if (cacVal !== null) {
    cacStatus = "neutral";
  }

  // 4. Conversão lead pago -> venda (%)
  const convVal = leads > 0 ? (sales / leads) * 100 : null;
  const convStatus: IndicatorStatus = convVal === null
    ? NEUTRAL
    : convVal > 8 ? "excellent"
    : convVal >= 4 ? "good" : "warning";

  // 5. CPL pago (R$) = investimento em campanhas de Conversas ÷ leads do WhatsApp
  const cplVal = leads > 0 ? invested / leads : null;
  const cplStatus: IndicatorStatus = cplVal === null
    ? NEUTRAL
    : cplVal >= 80 && cplVal <= 250 ? "good"
    : cplVal < 80 ? "warning" : "warning";

  // 6. Ticket médio pago vs ticket geral
  const ticketVal = paidTicket > 0 ? paidTicket : null;
  let ticketStatus: IndicatorStatus = NEUTRAL;
  if (ticketVal !== null && generalTicket > 0) {
    const diffPct = ((ticketVal - generalTicket) / generalTicket) * 100;
    ticketStatus = diffPct >= 10 ? "excellent"
      : diffPct >= -5 ? "good"
      : "warning";
  } else if (ticketVal !== null) {
    ticketStatus = "neutral";
  }

  return {
    roas: build({
      key: "roas",
      title: "ROAS pago",
      formula: "Receita pago ÷ Investimento",
      benchmark: "Bom: 6x–10x · Excelente: >10x",
      value: roasVal,
      display: roasVal === null ? "—" : `${roasVal.toFixed(2).replace(".", ",")}x`,
      status: roasStatus,
    }),
    costRevenue: build({
      key: "cost_revenue",
      title: "Custo de mídia / Receita",
      formula: "Investimento ÷ Receita pago",
      benchmark: "Bom: ≤15% · Excelente: <10% · Crítico: >20%",
      value: costRevVal,
      display: costRevVal === null ? "—" : `${costRevVal.toFixed(2).replace(".", ",")}%`,
      status: costRevStatus,
    }),
    cac: build({
      key: "cac",
      title: "CAC pago",
      formula: "Investimento ÷ Vendas pagas",
      benchmark: "Bom: ≤8% do ticket pago · Excelente: ≤5%",
      value: cacVal,
      display: cacVal === null ? "—" : fmtBrl(cacVal),
      status: cacStatus,
    }),
    conversion: build({
      key: "conversion",
      title: "Conversão lead → venda",
      formula: "Vendas pagas ÷ Leads pagos",
      benchmark: "Bom: 4%–8% · Excelente: >8%",
      value: convVal,
      display: convVal === null ? "—" : `${convVal.toFixed(2).replace(".", ",")}%`,
      status: convStatus,
    }),
    cpl: build({
      key: "cpl",
      title: "CPL pago",
      formula: "Investimento em Conversas ÷ Leads do WhatsApp",
      benchmark: "Faixa saudável: R$ 80 – R$ 250 por lead",
      value: cplVal,
      display: cplVal === null ? "—" : fmtBrl(cplVal),
      status: cplStatus,
    }),
    ticket: build({
      key: "ticket",
      title: "Ticket médio pago",
      formula: "Receita pago ÷ Vendas pagas",
      benchmark: "Bom: ≥ ticket geral · Excelente: +10% acima",
      value: ticketVal,
      display: ticketVal === null ? "—" : fmtBrl(ticketVal),
      status: ticketStatus,
    }),
  };
}

export type CacRating = "excellent" | "good" | "warning" | "critical";

export interface CacScore {
  rating: CacRating;
  label: string;
  color: string; // hsl token reference
  pctOfTarget: number; // current vs target
  message: string;
}

export function rateCac(currentCac: number | null, targetCac: number): CacScore {
  if (currentCac === null || !isFinite(currentCac) || currentCac <= 0) {
    return {
      rating: "warning",
      label: "Sem dados",
      color: "hsl(var(--muted-foreground))",
      pctOfTarget: 0,
      message: "Sem vendas suficientes no período para calcular o CAC.",
    };
  }
  const pct = (currentCac / targetCac) * 100;
  if (pct < 80) {
    return {
      rating: "excellent",
      label: "Excelente",
      color: "hsl(var(--success))",
      pctOfTarget: pct,
      message: `CAC ${(100 - pct).toFixed(0)}% abaixo da meta — aquisição muito eficiente.`,
    };
  }
  if (pct <= 100) {
    return {
      rating: "good",
      label: "Bom",
      color: "hsl(217 91% 60%)",
      pctOfTarget: pct,
      message: `CAC dentro da meta (${pct.toFixed(0)}% do alvo).`,
    };
  }
  if (pct <= 130) {
    return {
      rating: "warning",
      label: "Atenção",
      color: "hsl(var(--warning))",
      pctOfTarget: pct,
      message: `CAC ${(pct - 100).toFixed(0)}% acima da meta — revisar campanhas de pior performance.`,
    };
  }
  return {
    rating: "critical",
    label: "Crítico",
    color: "hsl(var(--destructive))",
    pctOfTarget: pct,
    message: `CAC ${(pct - 100).toFixed(0)}% acima da meta — ação imediata recomendada.`,
  };
}