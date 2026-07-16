// Ingestion endpoint for n8n (CAC monthly spreadsheet).
// - Authenticates via x-ingest-secret header
// - Accepts payload: { rows: [{ mes, leads_pagos, vendas_fechadas, leads_vendas_fechadas }, ...] }
// - Tolerates header variations: "MÊS/ANO", "Mês/Ano", "Leads Pagos", "Vendas Fechadas", etc.
// - IGNORES any "Valor Investido" field — investment is computed from campaigns_daily on the frontend
// - Upserts row-by-row by month (does NOT wipe history)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  let s = v.trim().replace(/\s/g, "");
  // Drop Excel division-by-zero and similar errors
  if (/^#.*!$/.test(s)) return 0;
  s = s.replace(/^R\$/i, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Parse a month-like string into the first day of that month (UTC, ISO yyyy-mm-dd).
 * Accepts: "2/2026", "02/2026", "2026-02", "2026-02-01", "2026-02-15", "01/02/2026", "2/2026 00:00:00"
 */
function parseMonth(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (input instanceof Date) {
    return `${input.getUTCFullYear()}-${pad2(input.getUTCMonth() + 1)}-01`;
  }
  const raw = String(input).trim();
  if (!raw) return null;

  // yyyy-mm-dd or yyyy-mm-ddThh...
  let m = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    if (mo >= 1 && mo <= 12) return `${y}-${pad2(mo)}-01`;
  }

  // dd/mm/yyyy
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    // If first part > 12, must be day/month/year. Else assume month/year stored as 1/yyyy or dd/mm.
    const mo = a > 12 ? b : a; // Brazilian sheets: "2/2026" => month=2; "01/02/2026" => month=2
    if (mo >= 1 && mo <= 12) return `${y}-${pad2(mo)}-01`;
  }

  // m/yyyy or mm/yyyy
  m = raw.match(/^(\d{1,2})\/(\d{4})/);
  if (m) {
    const mo = +m[1];
    const y = +m[2];
    if (mo >= 1 && mo <= 12) return `${y}-${pad2(mo)}-01`;
  }

  // yyyy/mm
  m = raw.match(/^(\d{4})\/(\d{1,2})/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    if (mo >= 1 && mo <= 12) return `${y}-${pad2(mo)}-01`;
  }

  return null;
}

function pick<T>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k] as T;
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("INGEST_SECRET");
  const provided = req.headers.get("x-ingest-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let rows: Array<Record<string, unknown>> = [];
  if (Array.isArray(payload)) {
    rows = payload as Array<Record<string, unknown>>;
  } else if (payload && typeof payload === "object") {
    const p = payload as { rows?: unknown; data?: unknown };
    if (Array.isArray(p.rows)) rows = p.rows as Array<Record<string, unknown>>;
    else if (Array.isArray(p.data)) rows = p.data as Array<Record<string, unknown>>;
    else rows = [payload as Record<string, unknown>];
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "No rows provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  type Insert = {
    month: string;
    paid_leads: number;
    closed_sales: number;
    leads_closed_sales: number;
    paid_revenue: number;
    general_avg_ticket: number;
    source: string;
    updated_at: string;
  };

  const inserts: Insert[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const nowIso = new Date().toISOString();

  rows.forEach((row, idx) => {
    const monthRaw = pick<unknown>(row, [
      "mes",
      "Mes",
      "Mês",
      "mês",
      "MÊS/ANO",
      "Mês/Ano",
      "mes_ano",
      "month",
      "Month",
      "data",
      "Data",
    ]);
    const month = parseMonth(monthRaw);
    if (!month) {
      errors.push({ row: idx, reason: `Could not parse month from "${String(monthRaw)}"` });
      return;
    }

    const paidLeads = toNumber(
      pick(row, ["leads_pagos", "Leads Pagos", "Leads pagos", "paid_leads", "leadsPagos"]),
    );
    const closedSales = toNumber(
      pick(row, [
        "vendas_fechadas",
        "Vendas Fechadas",
        "vendas",
        "Vendas",
        "closed_sales",
        "vendasFechadas",
      ]),
    );
    const leadsClosedSales = toNumber(
      pick(row, [
        "leads_vendas_fechadas",
        "Leads Vendas Fechadas",
        "leads_vendas",
        "leads_closed_sales",
        "leadsVendasFechadas",
      ]),
    );
    const paidRevenue = toNumber(
      pick(row, [
        "faturamento_pago",
        "Faturamento em vendas do tráfego pago",
        "Faturamento Trafego Pago",
        "faturamento_trafego_pago",
        "paid_revenue",
        "receita_paga",
      ]),
    );
    const generalAvgTicket = toNumber(
      pick(row, [
        "ticket_medio_geral",
        "Ticket médio de vendas gerais",
        "Ticket Medio Geral",
        "ticket_geral",
        "general_avg_ticket",
      ]),
    );

    inserts.push({
      month,
      paid_leads: paidLeads,
      closed_sales: closedSales,
      leads_closed_sales: leadsClosedSales,
      paid_revenue: paidRevenue,
      general_avg_ticket: generalAvgTicket,
      source: "n8n",
      updated_at: nowIso,
    });
  });

  if (inserts.length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid rows", details: errors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Deduplicate by month within this batch — keep last occurrence
  const dedup = new Map<string, Insert>();
  for (const r of inserts) dedup.set(r.month, r);
  const finalInserts = Array.from(dedup.values());

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase
    .from("cac_monthly")
    .upsert(finalInserts, { onConflict: "month" });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message, details: errors }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      rows_received: rows.length,
      rows_upserted: finalInserts.length,
      errors,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});