// Returns total WhatsApp leads count (optionally filtered by date range and seller).
// Auth: requires header x-ingest-secret matching INGEST_SECRET.
// Query params (all optional):
//   start=YYYY-MM-DD   (inclusive, by data_lead)
//   end=YYYY-MM-DD     (inclusive, by data_lead)
//   vendedor=fernando|roberto|<nome>  (case-insensitive contains)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const expected = Deno.env.get("INGEST_SECRET");
  const provided = req.headers.get("x-ingest-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const vendedor = url.searchParams.get("vendedor");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let q = supabase
    .from("whatsapp_leads")
    .select("vendedor", { count: "exact", head: false });

  if (start) q = q.gte("data_lead", `${start}T00:00:00+00:00`);
  if (end) q = q.lte("data_lead", `${end}T23:59:59+00:00`);
  if (vendedor) q = q.ilike("vendedor", `%${vendedor}%`);

  const { data, count, error } = await q;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = data ?? [];
  const breakdown = { fernando: 0, roberto: 0, outros: 0 } as Record<string, number>;
  for (const r of rows) {
    const v = (r.vendedor ?? "").toString().toLowerCase();
    if (v.includes("fernando")) breakdown.fernando++;
    else if (v.includes("roberto")) breakdown.roberto++;
    else breakdown.outros++;
  }

  const nowMonth = new Date().toISOString().slice(0, 7);
  const month = start ? start.slice(0, 7) : end ? end.slice(0, 7) : nowMonth;

  return new Response(
    JSON.stringify({
      ok: true,
      month,
      total: count ?? rows.length,
      breakdown,
      filters: { start, end, vendedor },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});