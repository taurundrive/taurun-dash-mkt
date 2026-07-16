// Ingestion endpoint for Instagram daily metrics (n8n).
// - Auth via x-ingest-secret header
// - Payload: { rows: [{ date, followers, reach, impressions, profile_views, likes, comments, shares, saves, website_clicks, posts_published }] }
// - Tolerates header variations
// - Upserts by date

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toInt(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? Math.round(v) : 0;
  if (typeof v !== "string") return 0;
  let s = v.trim().replace(/\s/g, "");
  if (/^#.*!$/.test(s)) return 0;
  s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n) : 0;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseDate(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (input instanceof Date) {
    return `${input.getUTCFullYear()}-${pad2(input.getUTCMonth() + 1)}-${pad2(input.getUTCDate())}`;
  }
  const raw = String(input).trim();
  if (!raw) return null;

  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    // dd/mm/yyyy (Brazilian)
    const day = a;
    const mo = b;
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) return `${y}-${pad2(mo)}-${pad2(day)}`;
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
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

  // Map Facebook Graph metric names -> our column
  const METRIC_MAP: Record<string, keyof Omit<Insert, "date" | "source" | "updated_at">> = {
    page_daily_follows: "followers",
    page_fan_adds_unique: "followers",
    page_impressions_unique: "reach",
    page_posts_impressions: "impressions",
    page_impressions: "impressions",
    page_media_view: "impressions",
    page_views_total: "profile_views",
    page_total_actions: "profile_views",
    page_post_engagements: "likes",
    post_clicks: "website_clicks",
    page_consumptions_unique: "website_clicks",
  };

  type Insert = {
    date: string;
    followers: number;
    reach: number;
    impressions: number;
    profile_views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    website_clicks: number;
    posts_published: number;
    source: string;
    updated_at: string;
  };

  function emptyRow(date: string): Insert {
    return {
      date,
      followers: 0, reach: 0, impressions: 0, profile_views: 0,
      likes: 0, comments: 0, shares: 0, saves: 0,
      website_clicks: 0, posts_published: 0,
      source: "n8n",
      updated_at: nowIso,
    };
  }

  const nowIso = new Date().toISOString();

  // Detect payload shape
  // Shape A (Graph native): { metrics: [{ name, values: [{ value, end_time }] }] }
  //                       OR a bare array of such metric objects
  // Shape B (rows):        { rows: [{ date, followers, ... }] }
  let rows: Array<Record<string, unknown>> = [];
  let graphMetrics: Array<{ name?: string; values?: Array<{ value?: unknown; end_time?: unknown }> }> = [];

  if (Array.isArray(payload)) {
    // Could be array of metric objects OR array of row objects
    const first = payload[0] as Record<string, unknown> | undefined;
    if (first && Array.isArray((first as { values?: unknown }).values) && typeof (first as { name?: unknown }).name === "string") {
      graphMetrics = payload as typeof graphMetrics;
    } else {
      rows = payload as Array<Record<string, unknown>>;
    }
  } else if (payload && typeof payload === "object") {
    const p = payload as { rows?: unknown; data?: unknown; metrics?: unknown };
    if (Array.isArray(p.metrics)) {
      graphMetrics = p.metrics as typeof graphMetrics;
    } else if (Array.isArray(p.data)) {
      // Facebook Graph wraps in { data: [...] }
      const arr = p.data as Array<Record<string, unknown>>;
      const first = arr[0];
      if (first && Array.isArray((first as { values?: unknown }).values) && typeof (first as { name?: unknown }).name === "string") {
        graphMetrics = arr as typeof graphMetrics;
      } else {
        rows = arr;
      }
    } else if (Array.isArray(p.rows)) {
      rows = p.rows as Array<Record<string, unknown>>;
    } else {
      rows = [payload as Record<string, unknown>];
    }
  }

  // If Graph metrics shape, fold it into rows-by-date
  if (graphMetrics.length > 0) {
    const byDate = new Map<string, Insert>();
    for (const metric of graphMetrics) {
      const name = String(metric.name ?? "").toLowerCase();
      const col = METRIC_MAP[name];
      if (!col || !Array.isArray(metric.values)) continue;
      for (const v of metric.values) {
        const date = parseDate(v.end_time);
        if (!date) continue;
        const value = toInt(v.value);
        const row = byDate.get(date) ?? emptyRow(date);
        // Sum if multiple metrics map to same column (e.g., page_impressions + page_media_view)
        (row[col] as number) = (row[col] as number) + value;
        byDate.set(date, row);
      }
    }
    rows = Array.from(byDate.values()) as unknown as Array<Record<string, unknown>>;
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "No rows provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const inserts: Insert[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  // If rows came from graphMetrics fold, they already have all columns set — pass through
  rows.forEach((row, idx) => {
    // If the row already looks like a complete Insert (has date + all numeric cols), use as-is
    if (row && typeof row === "object" && typeof (row as Insert).date === "string"
        && typeof (row as Insert).followers === "number") {
      inserts.push(row as unknown as Insert);
      return;
    }

    const dateRaw = pick<unknown>(row, [
      "date", "Date", "data", "Data", "dia", "Dia", "day",
    ]);
    const date = parseDate(dateRaw);
    if (!date) {
      errors.push({ row: idx, reason: `Could not parse date from "${String(dateRaw)}"` });
      return;
    }

    inserts.push({
      date,
      followers: toInt(pick(row, ["followers", "Followers", "seguidores", "Seguidores"])),
      reach: toInt(pick(row, ["reach", "Reach", "alcance", "Alcance"])),
      impressions: toInt(pick(row, ["impressions", "Impressions", "impressoes", "Impressões", "impressões"])),
      profile_views: toInt(pick(row, ["profile_views", "Profile Views", "visualizacoes_perfil", "Visualizações do Perfil", "visualizacoes_do_perfil"])),
      likes: toInt(pick(row, ["likes", "Likes", "curtidas", "Curtidas"])),
      comments: toInt(pick(row, ["comments", "Comments", "comentarios", "Comentários", "comentários"])),
      shares: toInt(pick(row, ["shares", "Shares", "compartilhamentos", "Compartilhamentos", "envios", "Envios"])),
      saves: toInt(pick(row, ["saves", "Saves", "salvamentos", "Salvamentos", "salvos", "Salvos"])),
      website_clicks: toInt(pick(row, ["website_clicks", "Website Clicks", "cliques_site", "Cliques no Site", "cliques_no_site"])),
      posts_published: toInt(pick(row, ["posts_published", "Posts Published", "posts", "Posts", "publicacoes", "Publicações"])),
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

  const dedup = new Map<string, Insert>();
  for (const r of inserts) dedup.set(r.date, r);
  const finalInserts = Array.from(dedup.values());

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase
    .from("instagram_metrics_daily")
    .upsert(finalInserts, { onConflict: "date" });

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