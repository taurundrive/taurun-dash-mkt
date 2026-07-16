// Ingestion endpoint for n8n (Z-API WhatsApp leads).
// - Authenticates via x-ingest-secret header
// - Accepts either:
//   a) Edit Fields shape: { Data, Nome, Numero } (Data = "DD/MM/YYYY HH:mm:ss" in America/Sao_Paulo)
//   b) Raw Z-API webhook body: { phone, chatName, text: { message }, momment, ... }
//   c) Array of either shape, or { rows: [...] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k] as T;
  }
  return undefined;
}

function getSaoPauloNowParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());

  const pickPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: pickPart("year"),
    month: pickPart("month"),
    day: pickPart("day"),
    hour: pickPart("hour"),
    minute: pickPart("minute"),
    second: pickPart("second"),
  };
}

/** Parse "DD/MM/YYYY HH:mm:ss" (America/Sao_Paulo) into an ISO timestamp. */
function parseBrDate(input: unknown): string | null {
  if (!input) return null;
  if (input instanceof Date) return input.toISOString();
  const raw = String(input).trim();
  if (!raw) return null;

  // ISO already?
  const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}T/);
  if (isoMatch) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // DD/MM/YYYY [HH:mm[:ss]]
  const m = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    const day = +m[1];
    const month = +m[2];
    const year = +m[3];
    const nowSp = getSaoPauloNowParts();
    const hasTime = Boolean(m[4]);
    const hh = hasTime ? +m[4] : nowSp.hour;
    const mm = hasTime ? +m[5] : nowSp.minute;
    const ss = hasTime && m[6] ? +m[6] : hasTime ? 0 : nowSp.second;
    // Treat as America/Sao_Paulo (UTC-3, no DST currently)
    const utcMs = Date.UTC(year, month - 1, day, hh + 3, mm, ss);
    const d = new Date(utcMs);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Unix millis
  if (/^\d{10,13}$/.test(raw)) {
    const n = +raw;
    const ms = raw.length <= 10 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }

  return null;
}

type Insert = {
  nome: string | null;
  telefone: string | null;
  mensagem: string | null;
  data_lead: string;
  vendedor: string | null;
  raw: unknown;
  source: string;
};

function normalizeRow(row: Record<string, unknown>): Insert | null {
  // Shape A: Edit Fields { Data, Nome, Numero }
  const nomeA = pick<string>(row, ["Nome", "nome", "name"]);
  const numeroA = pick<string>(row, ["Numero", "numero", "Telefone", "telefone", "phone"]);
  const dataA = pick<unknown>(row, ["Data", "data", "data_lead", "dataLead"]);

  // Shape B: Raw Z-API body (possibly wrapped in { body: ... })
  const body = (row.body && typeof row.body === "object" ? row.body : row) as Record<string, unknown>;
  const nomeB = pick<string>(body, ["chatName", "senderName"]);
  const numeroB = pick<string>(body, ["phone"]);
  const text = body.text as { message?: string } | undefined;
  const mensagemB = text?.message ?? pick<string>(body, ["message"]);
  const momment = pick<unknown>(body, ["momment", "moment", "timestamp"]);

  const nome = nomeA ?? nomeB ?? null;
  const telefone = (numeroA ?? numeroB ?? null) as string | null;
  const mensagem =
    pick<string>(row, ["Mensagem", "mensagem", "message"]) ?? mensagemB ?? null;

  const dataIso =
    parseBrDate(dataA) ?? parseBrDate(momment) ?? new Date().toISOString();

  const vendedorRaw =
    pick<string>(row, ["Vendedor", "vendedor", "seller", "Seller", "atendente"]) ?? null;
  const vendedor = vendedorRaw ? String(vendedorRaw).trim() : null;

  if (!nome && !telefone) return null;

  return {
    nome,
    telefone: telefone ? String(telefone) : null,
    mensagem: mensagem ?? null,
    data_lead: dataIso,
    vendedor,
    raw: row,
    source: "n8n-zapi",
  };
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

  const inserts: Insert[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  rows.forEach((r, idx) => {
    const n = normalizeRow(r);
    if (!n) errors.push({ row: idx, reason: "missing nome/telefone" });
    else inserts.push(n);
  });

  if (inserts.length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid rows", details: errors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.from("whatsapp_leads").insert(inserts);

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
      rows_inserted: inserts.length,
      errors,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});