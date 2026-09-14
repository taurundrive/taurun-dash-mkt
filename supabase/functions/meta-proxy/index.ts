// supabase/functions/meta-proxy/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Meta (Facebook / Instagram) Graph API — Proxy Seguro Server-Side
//
// Esta Edge Function roda no runtime Deno da Supabase e mantém o token
// da Meta (META_ACCESS_TOKEN) protegido no servidor, evitando que seja
// exposto em texto plano no bundle frontend do Vite.
//
// Suporta as seguintes ações via POST:
//   - "campaigns": busca contas ativas e insights diários agregados (Campaign[])
//   - "ad-accounts": lista contas de anúncio vinculadas ao token
//   - "instagram-insights": busca dados de alcance, seguidores e engajamento diário
//   - "instagram-posts": busca posts recentes com insights e identificação de collabs
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-meta-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ── Tipos de objetivos da Meta que mapeiam para conversas de WhatsApp ────────
const CONVERSAS_OBJECTIVES = new Set([
  "outcome_engagement",
  "messages",
  "outcome_messages",
  "outcome_leads",
  "lead_generation",
]);

const LEAD_ACTION_TYPES = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "lead",
]);

const TRAFFIC_ACTION_TYPES = new Set([
  "link_click",
  "landing_page_view",
]);

// ── Funções de auxílio interno ────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function inferType(objective: string | null | undefined, name: string): string {
  const o = (objective ?? "").toLowerCase();

  if (CONVERSAS_OBJECTIVES.has(o)) return "Conversas por mensagem iniciadas";
  if (o === "link_clicks" || o === "outcome_traffic" || o === "traffic") return "Tráfego";
  if (o === "outcome_awareness" || o === "brand_awareness" || o === "reach") return "Alcance";

  if (o.includes("mensagem") || o.includes("conversa")) return "Conversas por mensagem iniciadas";
  if (o.includes("alcance") || o.includes("reach")) return "Alcance";
  if (o.includes("engaj")) return "Engajamento";
  if (o.includes("tráfego") || o.includes("trafego") || o.includes("traffic")) return "Tráfego";
  if (o.includes("página") || o.includes("pagina") || o.includes("landing"))
    return "Visualizações da página de destino";

  const n = name.toLowerCase();
  if (n.includes("tatame") || n.includes("revestimento")) return "Conversas por mensagem iniciadas";

  return "Tráfego";
}

function sumLeads(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions || actions.length === 0) return 0;

  return actions
    .filter((a) => LEAD_ACTION_TYPES.has(a.action_type))
    .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

function sumClicks(
  actions: Array<{ action_type: string; value: string }> | undefined,
  directClicks: number
): number {
  if (directClicks > 0) return directClicks;
  if (!actions || actions.length === 0) return 0;

  return actions
    .filter((a) => TRAFFIC_ACTION_TYPES.has(a.action_type))
    .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

// ── Utilitário de paginação na Graph API ──────────────────────────────────────
async function fetchAllPages<T>(initialUrl: string, maxPages = 5): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[MetaGraphAPI] HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`[MetaGraphAPI] ${json.error.type}: ${json.error.message}`);
    }

    results.push(...(json.data ?? []));
    pages++;
    nextUrl = json.paging?.next;
  }

  return results;
}

// ── Servidor Principal Deno ───────────────────────────────────────────────────
serve(async (req: Request) => {
  // Trata preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // Prioridade de token:
    // 1. Secret de ambiente do Supabase (META_ACCESS_TOKEN)
    // 2. Token passado via header x-meta-token ou body (migração gradual)
    const token =
      Deno.env.get("META_ACCESS_TOKEN") ||
      req.headers.get("x-meta-token") ||
      body.meta_token;

    if (!token) {
      return jsonResponse(
        {
          error:
            "META_ACCESS_TOKEN não configurado no servidor Supabase. " +
            "Configure via 'supabase secrets set META_ACCESS_TOKEN=...' no painel.",
        },
        401
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AÇÃO 1: Listar Contas de Anúncio
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "ad-accounts") {
      const url = `${META_BASE_URL}/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}&limit=50`;
      const accounts = await fetchAllPages(url, 2);
      return jsonResponse({ ok: true, data: accounts });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AÇÃO 2: Buscar Insights de Campanhas agregados
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "campaigns") {
      const since = String(body.since || "");
      const until = String(body.until || "");

      if (!since || !until) {
        return jsonResponse({ error: "Parâmetros 'since' e 'until' são obrigatórios." }, 400);
      }

      // 1. Busca contas de anúncio
      const accUrl = `${META_BASE_URL}/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}&limit=50`;
      const accounts = await fetchAllPages<{ id: string; name: string; account_status: number }>(
        accUrl,
        2
      );
      const activeAccounts = accounts.filter((a) => a.account_status === 1);

      if (activeAccounts.length === 0) {
        return jsonResponse({ ok: true, data: [] });
      }

      // 2. Busca insights diários de todas as contas em paralelo
      const fields = [
        "campaign_id",
        "campaign_name",
        "objective",
        "date_start",
        "date_stop",
        "spend",
        "clicks",
        "impressions",
        "reach",
        "actions",
      ].join(",");

      const allRowsNested = await Promise.all(
        activeAccounts.map(async (acc) => {
          try {
            const url =
              `${META_BASE_URL}/${acc.id}/insights` +
              `?fields=${fields}` +
              `&level=campaign` +
              `&time_increment=1` +
              `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
              `&access_token=${token}` +
              `&limit=500`;
            return await fetchAllPages<Record<string, unknown>>(url, 5);
          } catch (err) {
            console.error(`Erro ao buscar insights da conta ${acc.id}:`, err);
            return [];
          }
        })
      );

      const allRows = allRowsNested.flat();

      // 3. Agrupa por nome de campanha para o formato Campaign[] do dashboard
      const byCampaign = new Map<
        string,
        {
          objective: string | null;
          daily: Map<string, { date: string; clicks: number; leads: number; invested: number }>;
        }
      >();

      for (const row of allRows) {
        const campaignName = String(row.campaign_name || "");
        if (!campaignName) continue;

        if (!byCampaign.has(campaignName)) {
          byCampaign.set(campaignName, {
            objective: (row.objective as string) ?? null,
            daily: new Map(),
          });
        }

        const bucket = byCampaign.get(campaignName)!;
        const type = inferType(bucket.objective, campaignName);
        const dateStart = String(row.date_start || "");

        const existing = bucket.daily.get(dateStart) ?? {
          date: dateStart,
          clicks: 0,
          leads: 0,
          invested: 0,
        };

        const directClicks = Number(row.clicks) || 0;
        existing.clicks += sumClicks(
          row.actions as Array<{ action_type: string; value: string }> | undefined,
          directClicks
        );
        existing.invested += Number(row.spend) || 0;
        existing.leads += sumLeads(
          row.actions as Array<{ action_type: string; value: string }> | undefined
        );

        bucket.daily.set(dateStart, existing);
      }

      const campaigns = Array.from(byCampaign.entries()).map(([name, info], i) => ({
        id: `meta-${i + 1}`,
        name,
        type: inferType(info.objective, name),
        daily: Array.from(info.daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
      }));

      return jsonResponse({ ok: true, data: campaigns });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AÇÃO 3: Insights de Instagram (Orgânico & Perfil)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "instagram-insights") {
      const since = String(body.since || "");
      const until = String(body.until || "");

      // 1. Descobrir ID do Instagram Business
      let igAccount: { id: string; username: string; followers_count: number; media_count: number } | null = null;

      const urlAccounts = `${META_BASE_URL}/me/accounts?fields=id,name,instagram_business_account{id,username,followers_count,media_count}&access_token=${token}&limit=50`;
      const resAccounts = await fetch(urlAccounts);
      if (resAccounts.ok) {
        const jsonAcc = await resAccounts.json();
        if (Array.isArray(jsonAcc.data)) {
          for (const page of jsonAcc.data) {
            if (page.instagram_business_account?.id) {
              igAccount = page.instagram_business_account;
              break;
            }
          }
        }
      }

      if (!igAccount) {
        const urlMe = `${META_BASE_URL}/me?fields=id,name,instagram_business_account{id,username,followers_count,media_count}&access_token=${token}`;
        const resMe = await fetch(urlMe);
        if (resMe.ok) {
          const jsonMe = await resMe.json();
          if (jsonMe.instagram_business_account?.id) {
            igAccount = jsonMe.instagram_business_account;
          }
        }
      }

      if (!igAccount) {
        return jsonResponse({ error: "Nenhuma conta do Instagram Business encontrada vinculada ao token." }, 404);
      }

      // 2. Busca alcance diário
      const urlReach = `${META_BASE_URL}/${igAccount.id}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${token}`;
      const resReach = await fetch(urlReach);
      const jsonReach = resReach.ok ? await resReach.json() : { data: [] };

      const byDate = new Map<string, Record<string, unknown>>();
      if (Array.isArray(jsonReach.data)) {
        for (const metric of jsonReach.data) {
          if (metric.name === "reach" && Array.isArray(metric.values)) {
            for (const val of metric.values) {
              const d = String(val.end_time || "").slice(0, 10);
              if (!d) continue;
              byDate.set(d, {
                date: d,
                followers: igAccount.followers_count || 0,
                reach: Number(val.value) || 0,
                impressions: 0,
                profile_views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                saves: 0,
                website_clicks: 0,
                posts_published: 0,
              });
            }
          }
        }
      }

      // 3. Busca totais do período
      const urlTotals = `${META_BASE_URL}/${igAccount.id}/insights?metric=views,profile_views,website_clicks,likes,comments,shares,saves,total_interactions&metric_type=total_value&period=day&since=${since}&until=${until}&access_token=${token}`;
      const resTotals = await fetch(urlTotals);
      if (resTotals.ok) {
        const jsonTotals = await resTotals.json();
        if (Array.isArray(jsonTotals.data)) {
          const totalsMap: Record<string, number> = {};
          for (const m of jsonTotals.data) {
            totalsMap[String(m.name).toLowerCase()] = Number(m.total_value?.value) || 0;
          }

          const rows = Array.from(byDate.values());
          const totalReach = rows.reduce((acc, r) => acc + (Number(r.reach) || 0), 0) || Math.max(1, rows.length);

          const mapping: Array<[string, string]> = [
            ["impressions", "views"],
            ["profile_views", "profile_views"],
            ["website_clicks", "website_clicks"],
            ["likes", "likes"],
            ["comments", "comments"],
            ["shares", "shares"],
            ["saves", "saves"],
          ];

          for (const [rowKey, apiMetric] of mapping) {
            const totalVal = totalsMap[apiMetric] || 0;
            if (totalVal > 0) {
              let running = 0;
              rows.forEach((r, idx) => {
                if (idx === rows.length - 1) {
                  r[rowKey] = Math.max(0, totalVal - running);
                } else {
                  const prop = (Number(r.reach) || 1) / totalReach;
                  const alloc = Math.round(totalVal * prop);
                  r[rowKey] = alloc;
                  running += alloc;
                }
              });
            }
          }
        }
      }

      const finalRows = Array.from(byDate.values()).sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );

      // Sincroniza em background no Supabase se as variáveis internas de service role estiverem disponíveis
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey && finalRows.length > 0) {
        const sb = createClient(supabaseUrl, serviceKey);
        sb.from("instagram_metrics_daily")
          .upsert(
            finalRows.map((r) => ({
              ...r,
              source: "meta-proxy-edge",
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "date" }
          )
          .then(() => {});
      }

      return jsonResponse({ ok: true, data: finalRows });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AÇÃO 4: Posts do Instagram com Collabs e Métricas Detalhadas
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "instagram-posts") {
      const since = String(body.since || "");
      const until = String(body.until || "");

      // 1. Descobre a conta IG
      let igId = "";
      let followersCount = 0;

      const urlAcc = `${META_BASE_URL}/me/accounts?fields=id,name,instagram_business_account{id,username,followers_count}&access_token=${token}&limit=50`;
      const resAcc = await fetch(urlAcc);
      if (resAcc.ok) {
        const json = await resAcc.json();
        for (const p of json.data ?? []) {
          if (p.instagram_business_account?.id) {
            igId = p.instagram_business_account.id;
            followersCount = p.instagram_business_account.followers_count || 0;
            break;
          }
        }
      }

      if (!igId) {
        return jsonResponse({ error: "Conta de Instagram não encontrada." }, 404);
      }

      // 2. Busca lista de mídias
      const fields = [
        "id",
        "caption",
        "media_type",
        "media_product_type",
        "permalink",
        "thumbnail_url",
        "media_url",
        "timestamp",
        "like_count",
        "comments_count",
        "collaborators{username,invite_status}",
      ].join(",");

      const mediaUrl = `${META_BASE_URL}/${igId}/media?fields=${fields}&access_token=${token}&limit=100`;
      const rawPosts = await fetchAllPages<Record<string, unknown>>(mediaUrl, 3);

      // Filtra pelo período
      const filteredPosts = rawPosts.filter((p) => {
        const ts = String(p.timestamp || "").slice(0, 10);
        if (!since || !until) return true;
        return ts >= since && ts <= until;
      });

      // 3. Busca insights detalhados de cada post (em lotes)
      const postsWithInsights = await Promise.all(
        filteredPosts.map(async (p) => {
          const pid = String(p.id);
          const pType = String(p.media_product_type || p.media_type || "");
          const isReel = pType === "REELS" || p.media_type === "VIDEO";

          let reach = 0;
          let views = 0;
          let saved = 0;
          let shares = 0;
          let totalInteractions = 0;

          try {
            const metricList = isReel
              ? "reach,plays,saved,shares,total_interactions"
              : "reach,impressions,saved,shares,total_interactions";
            const insUrl = `${META_BASE_URL}/${pid}/insights?metric=${metricList}&access_token=${token}`;
            const insRes = await fetch(insUrl);
            if (insRes.ok) {
              const insJson = await insRes.json();
              for (const m of insJson.data ?? []) {
                const name = String(m.name).toLowerCase();
                const val = Number(m.values?.[0]?.value) || 0;
                if (name === "reach") reach = val;
                if (name === "plays" || name === "impressions") views = val;
                if (name === "saved") saved = val;
                if (name === "shares") shares = val;
                if (name === "total_interactions") totalInteractions = val;
              }
            }
          } catch {
            // tolera erro de insights de posts individuais antigos
          }

          const likes = Number(p.like_count) || 0;
          const comments = Number(p.comments_count) || 0;
          if (totalInteractions === 0) {
            totalInteractions = likes + comments + saved + shares;
          }

          const engagementRate =
            reach > 0
              ? Number(((totalInteractions / reach) * 100).toFixed(2))
              : followersCount > 0
              ? Number(((totalInteractions / followersCount) * 100).toFixed(2))
              : 0;

          // Detecção de Collabs
          const collabData = p.collaborators as { data?: Array<{ username?: string }> } | undefined;
          const collaborators = (collabData?.data ?? [])
            .map((c) => c.username)
            .filter(Boolean) as string[];

          let normType: "REELS" | "CAROUSEL" | "IMAGE" = "IMAGE";
          if (isReel) normType = "REELS";
          else if (p.media_type === "CAROUSEL_ALBUM") normType = "CAROUSEL";

          return {
            id: pid,
            caption: String(p.caption || ""),
            mediaType: normType,
            mediaProductType: String(p.media_product_type || ""),
            permalink: String(p.permalink || ""),
            thumbnailUrl: String(p.thumbnail_url || p.media_url || ""),
            mediaUrl: String(p.media_url || ""),
            timestamp: String(p.timestamp || ""),
            likes,
            comments,
            shares,
            saved,
            reach,
            views,
            totalInteractions,
            engagementRate,
            isCollab: collaborators.length > 0,
            collaborators,
          };
        })
      );

      // 4. Calcula o resumo consolidado do período
      const totalReach = postsWithInsights.reduce((sum, p) => sum + p.reach, 0);
      const totalViews = postsWithInsights.reduce((sum, p) => sum + p.views, 0);
      const totalLikes = postsWithInsights.reduce((sum, p) => sum + p.likes, 0);
      const totalComments = postsWithInsights.reduce((sum, p) => sum + p.comments, 0);
      const totalShares = postsWithInsights.reduce((sum, p) => sum + p.shares, 0);
      const totalCollabs = postsWithInsights.filter((p) => p.isCollab).length;
      const avgEngagement =
        postsWithInsights.length > 0
          ? Number(
              (
                postsWithInsights.reduce((sum, p) => sum + p.engagementRate, 0) /
                postsWithInsights.length
              ).toFixed(2)
            )
          : 0;

      const summary = {
        followersCount,
        totalPosts: postsWithInsights.length,
        totalCollabs,
        totalViews,
        totalReach,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate: avgEngagement,
      };

      return jsonResponse({
        ok: true,
        data: {
          summary,
          posts: postsWithInsights,
        },
      });
    }

    return jsonResponse({ error: `Ação '${action}' desconhecida.` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[meta-proxy] Erro fatal:", message);
    return jsonResponse({ error: message }, 500);
  }
});
