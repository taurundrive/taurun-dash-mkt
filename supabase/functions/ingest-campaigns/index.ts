// Ingestion endpoint for n8n webhook (Meta Graph API live snapshot).
// - Authenticates via x-ingest-secret header
// - Accepts payload: { rows: [{ id_campanha, nome_campanha, valor_gasto, cliques,
//     mensagens_iniciadas, total_vendido_geral }, ...] }
//   (also tolerates "sales" / "REALIZADO" passed at the top level)
// - Each call REPLACES the full snapshot in campaigns_daily (lifetime totals stored
//   as a single row per campaign at today's date)
// - Updates sales_monthly for the current month with total_vendido_geral

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RawRow {
  id_campanha?: string | number;
  nome_campanha?: string;
  campanha?: string;
  objetivo?: string;
  valor_gasto?: string | number;
  valor_usado?: string | number;
  cliques?: string | number;
  mensagens_iniciadas?: string | number;
  resultado?: string | number;
  total_vendido_geral?: string | number;
  data?: string;
  date_start?: string;
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  // Normalize BR currency: "R$ 1.234,56" -> 1234.56
  let s = v.trim().replace(/\s/g, "");
  s = s.replace(/^R\$/i, "");
  // If both . and , present, assume . is thousand sep and , decimal
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // only comma -> decimal separator
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function parseDate(s: string): Date | null {
  // Accept yyyy-mm-dd or dd/mm/yyyy
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

function parseRange(field: string): { start: Date; end: Date } | null {
  // Examples:
  // "2026-04-01 - 2026-04-20"
  // "2026-04-01 a 2026-04-20"
  // "01/04/2026 - 20/04/2026"
  // "2026-04-15"
  const normalized = field.replace(/\s+/g, " ").trim();
  const matches = normalized.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/g) ?? [];

  if (matches.length === 0) return null;

  const first = matches[0];
  if (!first) return null;

  if (matches.length === 1) {
    const d = parseDate(first);
    return d ? { start: d, end: d } : null;
  }

  const second = matches[1];
  if (!second) return null;

  const a = parseDate(first);
  const b = parseDate(second);
  if (a && b) return a <= b ? { start: a, end: b } : { start: b, end: a };
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

  // Auth: x-ingest-secret header
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

  // Accept { rows: [...] }, [...], or a single object
  let rows: RawRow[] = [];
  let salesPayload: unknown = null;
  if (Array.isArray(payload)) {
    rows = payload as RawRow[];
  } else if (payload && typeof payload === "object") {
    const p = payload as {
      rows?: RawRow[];
      data?: RawRow[];
      sales?: unknown;
      vendas?: unknown;
      total_vendido?: unknown;
      total_vendido_geral?: unknown;
      REALIZADO?: unknown;
      "Valor Vendido"?: unknown;
    } & RawRow;
    if (Array.isArray(p.rows)) rows = p.rows;
    else if (Array.isArray(p.data)) rows = p.data;
    else rows = [p];
    salesPayload =
      p.sales ??
      p.vendas ??
      p.total_vendido ??
      p.total_vendido_geral ??
      p.REALIZADO ??
      p["Valor Vendido"] ??
      null;
  }

  // If sales weren't at the top level, derive from the first row's total_vendido_geral
  if (salesPayload === null && rows.length > 0) {
    const r0 = rows[0] as Record<string, unknown>;
    salesPayload = r0.total_vendido_geral ?? r0.REALIZADO ?? null;
  }

  if (rows.length === 0 && !salesPayload) {
    return new Response(JSON.stringify({ error: "No rows provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Generate a single batch_id for this snapshot
  const batchId = crypto.randomUUID();
  const today = isoDate(new Date());

  type DailyInsert = {
    campanha: string;
    objetivo: string | null;
    data: string;
    resultado: number;
    cliques: number;
    valor_usado: number;
    custo_por_clique: number;
    range_start: string;
    range_end: string;
    batch_id: string;
  };

  const inserts: DailyInsert[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  rows.forEach((row, idx) => {
    const r = row as unknown as Record<string, unknown>;
    const campanha = pick<string>(r, [
      "nome_campanha",
      "campanha",
      "Campanha",
      "campaign_name",
      "campaign",
    ]);
    if (!campanha) {
      errors.push({ row: idx, reason: "Missing 'nome_campanha'" });
      return;
    }
    const objetivo = pick<string>(r, ["objetivo", "Objetivo", "objective"]) ?? null;

    const cliques = toNumber(pick(r, ["cliques", "Cliques", "clicks"]));
    const valorUsado = toNumber(
      pick(r, ["valor_gasto", "valor_usado", "Valor usado", "spend", "investido"]),
    );
    const resultado = toNumber(
      pick(r, ["mensagens_iniciadas", "resultado", "Resultado", "leads", "conversions"]),
    );
    const cpc = cliques > 0 ? valorUsado / cliques : 0;

    // Use the row's date if provided (daily breakdown); otherwise today
    const dataField = pick<string>(r, ["data", "Data", "date_start", "date"]);
    let rowDate = today;
    if (dataField) {
      const parsed = parseDate(String(dataField));
      if (parsed) rowDate = isoDate(parsed);
    }

    inserts.push({
      campanha: String(campanha),
      objetivo: objetivo ? String(objetivo) : null,
      data: rowDate,
      resultado,
      cliques,
      valor_usado: valorUsado,
      custo_por_clique: cpc,
      range_start: rowDate,
      range_end: rowDate,
      batch_id: batchId,
    });
  });

  // Replace the entire snapshot (Meta Graph API is queried live each run)
  if (inserts.length > 0) {
    // Wipe previous snapshot then upsert (idempotent re-runs safe)
    const { error: delErr } = await supabase
      .from("campaigns_daily")
      .delete()
      .gte("data", "1900-01-01");
    if (delErr) {
      return new Response(
        JSON.stringify({ error: `clear snapshot: ${delErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Deduplicate by (campanha, data) within this batch — keeps the LAST occurrence
    const dedup = new Map<string, DailyInsert>();
    for (const row of inserts) {
      dedup.set(`${row.campanha}__${row.data}`, row);
    }
    const finalInserts = Array.from(dedup.values());

    const { error } = await supabase
      .from("campaigns_daily")
      .upsert(finalInserts, { onConflict: "campanha,data" });
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, details: errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Upsert monthly sales total (if provided)
  let salesUpserted: { month: string; total_sales: number } | null = null;
  if (salesPayload !== null && salesPayload !== undefined) {
    // Accept number, string, { total, month }, or { REALIZADO }
    let total = 0;
    let month: Date | null = null;
    if (typeof salesPayload === "number" || typeof salesPayload === "string") {
      total = toNumber(salesPayload);
    } else if (salesPayload && typeof salesPayload === "object") {
      const s = salesPayload as Record<string, unknown>;
      total = toNumber(
        s.total ?? s.amount ?? s.value ?? s.valor ?? s.REALIZADO ?? s.realizado ?? s.sum_REALIZADO,
      );
      const monthStr = s.month ?? s.mes ?? s["Mês"] ?? s.data;
      if (typeof monthStr === "string") {
        const d = parseDate(monthStr);
        if (d) month = d;
      }
    }
    if (!month) {
      // Default: first day of the current month
      const r = new Date();
      month = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), 1));
    }
    const monthIso = isoDate(month);
    if (total > 0) {
      const { error: salesErr } = await supabase
        .from("sales_monthly")
        .upsert(
          { month: monthIso, total_sales: total, source: "n8n", updated_at: new Date().toISOString() },
          { onConflict: "month" },
        );
      if (salesErr) {
        return new Response(
          JSON.stringify({ error: `sales upsert: ${salesErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      salesUpserted = { month: monthIso, total_sales: total };
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      batch_id: batchId,
      rows_received: rows.length,
      rows_inserted: inserts.length,
      sales: salesUpserted,
      errors,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});