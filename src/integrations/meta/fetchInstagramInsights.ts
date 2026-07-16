/**
 * fetchInstagramInsights — Busca insights orgânicos e de perfil direto da Graph API do Meta/Instagram
 * sem precisar do n8n!
 *
 * Sincroniza métricas diárias (reach, followers) e totais exatos do período (views/impressões, profile_views,
 * website_clicks, likes, comments, shares, saves, total_interactions) da API v20.0 do Instagram.
 */

import { supabase } from "@/integrations/supabase/client";

export interface InstaRow {
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
}

const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Descobre o ID do Instagram Business vinculado à página do Facebook usando o token atual.
 */
export async function getInstagramBusinessAccount(token?: string): Promise<{
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
} | null> {
  const accessToken = token || import.meta.env.VITE_META_ACCESS_TOKEN;
  if (!accessToken) return null;

  try {
    // 1. Primeiro tenta via /me/accounts (se for Token de Usuário ou Sistema)
    const urlAccounts = `${META_BASE_URL}/me/accounts?fields=id,name,instagram_business_account{id,username,followers_count,media_count}&access_token=${accessToken}&limit=50`;
    const resAccounts = await fetch(urlAccounts);
    if (resAccounts.ok) {
      const jsonAccounts = await resAccounts.json();
      if (jsonAccounts.data && Array.isArray(jsonAccounts.data)) {
        for (const page of jsonAccounts.data) {
          if (page.instagram_business_account?.id) {
            return page.instagram_business_account;
          }
        }
      }
    }

    // 2. Fallback: se for Token de Página (onde /me já é a própria página)
    const urlMe = `${META_BASE_URL}/me?fields=id,name,instagram_business_account{id,username,followers_count,media_count}&access_token=${accessToken}`;
    const resMe = await fetch(urlMe);
    if (resMe.ok) {
      const jsonMe = await resMe.json();
      if (jsonMe.instagram_business_account?.id) {
        return jsonMe.instagram_business_account;
      }
    }

    return null;
  } catch (err) {
    console.error("[MetaAPI] Erro ao buscar conta de Instagram:", err);
    return null;
  }
}

/**
 * Busca insights diários oficiais (reach) e totais exatos do período (views, profile_views, etc.)
 * e distribui proporcionalmente pela série temporal para exibição perfeita nos gráficos e KPIs.
 */
export async function syncInstagramInsights(since: string, until: string): Promise<InstaRow[] | null> {
  const accessToken = import.meta.env.VITE_META_ACCESS_TOKEN as string;
  if (!accessToken) return null;

  const igAccount = await getInstagramBusinessAccount(accessToken);
  if (!igAccount) {
    console.warn("[MetaAPI] Nenhum Instagram Business vinculado encontrado no token atual.");
    return null;
  }

  try {
    // 1. Busca série diária de Alcance (reach)
    const urlReach =
      `${META_BASE_URL}/${igAccount.id}/insights` +
      `?metric=reach` +
      `&period=day` +
      `&since=${since}&until=${until}` +
      `&access_token=${accessToken}`;

    const resReach = await fetch(urlReach);
    if (!resReach.ok) {
      console.warn("[MetaAPI] Erro ao buscar reach diário do IG:", await resReach.text());
      return null;
    }

    const jsonReach = await resReach.json();
    const byDate = new Map<string, InstaRow>();

    if (Array.isArray(jsonReach.data)) {
      for (const metric of jsonReach.data) {
        if (metric.name === "reach" && Array.isArray(metric.values)) {
          for (const val of metric.values) {
            const dateRaw = String(val.end_time || "").slice(0, 10);
            if (!dateRaw) continue;
            byDate.set(dateRaw, {
              date: dateRaw,
              followers: igAccount.followers_count || 0,
              reach: Number(val.value) || 0,
              impressions: 0,
              profile_views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              saves: 0,
              website_clicks: 0,
              posts_published: Math.round((igAccount.media_count || 0) / Math.max(1, byDate.size || 30)),
            });
          }
        }
      }
    }

    // Se a série de reach vier vazia por causa do range de datas, cria ao menos o dia de hoje
    if (byDate.size === 0) {
      const today = new Date().toISOString().slice(0, 10);
      byDate.set(today, {
        date: today,
        followers: igAccount.followers_count || 0,
        reach: 0,
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

    const rows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const totalReach = rows.reduce((acc, r) => acc + r.reach, 0) || rows.length;

    // 2. Busca totais exatos do período (views, profile_views, website_clicks, total_interactions, likes, comments, shares, saves)
    const urlTotals =
      `${META_BASE_URL}/${igAccount.id}/insights` +
      `?metric=views,profile_views,website_clicks,likes,comments,shares,saves,total_interactions` +
      `&metric_type=total_value&period=day` +
      `&since=${since}&until=${until}` +
      `&access_token=${accessToken}`;

    const resTotals = await fetch(urlTotals);
    if (resTotals.ok) {
      const jsonTotals = await resTotals.json();
      if (Array.isArray(jsonTotals.data)) {
        const totalsMap: Record<string, number> = {};
        for (const m of jsonTotals.data) {
          const name = String(m.name).toLowerCase();
          totalsMap[name] = Number(m.total_value?.value) || 0;
        }

        // Distribui proporcionalmente ao alcance diário (ou igualmente) para manter a soma exata 100% precisa nos KPIs
        const fields: Array<[keyof InstaRow, string]> = [
          ["impressions", "views"],
          ["profile_views", "profile_views"],
          ["website_clicks", "website_clicks"],
          ["likes", "likes"],
          ["comments", "comments"],
          ["shares", "shares"],
          ["saves", "saves"],
        ];

        for (const [rowKey, apiMetric] of fields) {
          const totalVal = totalsMap[apiMetric] || 0;
          if (totalVal > 0) {
            let runningSum = 0;
            rows.forEach((r, idx) => {
              if (idx === rows.length - 1) {
                // Último dia recebe a diferença exata para garantir que o somatório seja 100% idêntico à API
                (r[rowKey] as number) = Math.max(0, totalVal - runningSum);
              } else {
                const proportion = (r.reach || 1) / totalReach;
                const allocated = Math.round(totalVal * proportion);
                (r[rowKey] as number) = allocated;
                runningSum += allocated;
              }
            });
          }
        }
      }
    }

    // 3. Sincroniza com a tabela do Supabase em background para cache instantâneo
    supabase
      .from("instagram_metrics_daily")
      .upsert(
        rows.map((r) => ({
          ...r,
          source: "meta-graph-api",
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "date" }
      )
      .then(({ error }) => {
        if (error) console.error("[MetaAPI] Erro ao salvar cache no Supabase:", error.message);
      });

    return rows;
  } catch (err) {
    console.error("[MetaAPI] Erro em syncInstagramInsights:", err);
    return null;
  }
}
