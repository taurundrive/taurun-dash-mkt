/**
 * fetchInstagramPosts — Busca posts e métricas analíticas detalhadas do Instagram
 * diretamente da Meta Graph API v20.0 com cache multi-nível (15min).
 */

export type InstagramMediaType = "REELS" | "CAROUSEL" | "IMAGE";

export interface InstagramPost {
  id: string;
  caption: string;
  mediaType: InstagramMediaType;
  mediaProductType: string;
  permalink: string;
  thumbnailUrl: string;
  mediaUrl: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  views: number;
  totalInteractions: number;
  engagementRate: number;
  isCollab: boolean;
  collaborators: string[];
}

export interface InstagramPeriodSummary {
  followersCount: number;
  totalPosts: number;
  totalCollabs: number;
  totalViews: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
}

export interface InstagramFetchResult {
  summary: InstagramPeriodSummary;
  posts: InstagramPost[];
  fromCache: boolean;
  timestamp: number;
}

import { invokeMetaProxy } from "./client";

const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

// Cache em memória durante a sessão da aplicação
const memoryCache = new Map<string, { data: InstagramFetchResult; expiry: number }>();

/**
 * Normaliza o tipo de mídia para simplificação na UI
 */
export function normalizeMediaType(mediaType: string, productType: string): InstagramMediaType {
  if (productType === "REELS" || mediaType === "VIDEO") return "REELS";
  if (mediaType === "CAROUSEL_ALBUM") return "CAROUSEL";
  return "IMAGE";
}

/**
 * Descobre o ID do Instagram Business e dados do perfil
 */
export async function getInstagramProfile(token?: string): Promise<{
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
} | null> {
  const accessToken = token || (import.meta.env.VITE_META_ACCESS_TOKEN as string);
  if (!accessToken) return null;

  try {
    const urlAccounts = `${META_BASE_URL}/me/accounts?fields=id,name,instagram_business_account{id,username,followers_count,media_count}&access_token=${accessToken}&limit=50`;
    const resAccounts = await fetch(urlAccounts);
    if (resAccounts.ok) {
      const json = await resAccounts.json();
      if (Array.isArray(json.data)) {
        for (const page of json.data) {
          if (page.instagram_business_account?.id) {
            return page.instagram_business_account;
          }
        }
      }
    }

    // Fallback caso /me já seja a própria página
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
    console.error("[MetaAPI] Erro ao buscar perfil do Instagram:", err);
    return null;
  }
}

/**
 * Busca insights detalhados de um post específico
 */
async function fetchPostInsights(
  postId: string,
  mediaProductType: string,
  accessToken: string,
): Promise<{
  reach: number;
  views: number;
  shares: number;
  saved: number;
  totalInteractions: number;
}> {
  // A Meta unificou as métricas para 'views' em todas as publicações (Reels e Feed)
  const metrics = "reach,saved,shares,views,total_interactions";

  try {
    const url = `${META_BASE_URL}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { reach: 0, views: 0, shares: 0, saved: 0, totalInteractions: 0 };
    }
    const json = await res.json();
    const result = { reach: 0, views: 0, shares: 0, saved: 0, totalInteractions: 0 };

    if (Array.isArray(json.data)) {
      for (const item of json.data) {
        const val = Number(item.values?.[0]?.value) || 0;
        if (item.name === "reach") result.reach = val;
        if (item.name === "views") result.views = val;
        if (item.name === "shares") result.shares = val;
        if (item.name === "saved") result.saved = val;
        if (item.name === "total_interactions") result.totalInteractions = val;
      }
    }
    return result;
  } catch {
    return { reach: 0, views: 0, shares: 0, saved: 0, totalInteractions: 0 };
  }
}

/**
 * Limpa o cache para forçar sincronização
 */
export function clearInstagramCache(month?: string) {
  if (month) {
    memoryCache.delete(month);
    try {
      sessionStorage.removeItem(`ig_posts_collab_v3_${month}`);
      sessionStorage.removeItem(`ig_posts_collab_v4_${month}`);
    } catch {}
  } else {
    memoryCache.clear();
    try {
      const keys = Object.keys(sessionStorage);
      for (const k of keys) {
        if (k.startsWith("ig_posts_collab_")) sessionStorage.removeItem(k);
      }
    } catch {}
  }
}

/**
 * Busca posts do Instagram e consolida métricas do período selecionado
 * com cache de 15 minutos.
 */
export async function fetchInstagramPosts(
  month?: string,
  forceRefresh = false,
): Promise<InstagramFetchResult | null> {
  const cacheKey = month || "all";

  // 1. Verifica cache em memória e sessionStorage (se não for forceRefresh)
  if (!forceRefresh) {
    const mem = memoryCache.get(cacheKey);
    if (mem && mem.expiry > Date.now()) {
      return { ...mem.data, fromCache: true };
    }
    try {
      const stored = sessionStorage.getItem(`ig_posts_collab_v4_${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiry > Date.now()) {
          memoryCache.set(cacheKey, parsed);
          return { ...parsed.data, fromCache: true };
        }
      }
    } catch {}
  }

  // 2. Prioridade Segura: Busca via Edge Function meta-proxy
  const since = month ? `${month}-01` : "";
  const until = month ? `${month}-31` : "";
  const proxyResult = await invokeMetaProxy<{
    summary: InstagramPeriodSummary;
    posts: InstagramPost[];
  }>("instagram-posts", { since, until, month });

  if (proxyResult?.summary && Array.isArray(proxyResult?.posts) && proxyResult.posts.length > 0) {
    let posts = [...proxyResult.posts];
    let summary = { ...proxyResult.summary };

    // Se o proxy retornou posts mas todas as views vieram zeradas (versão anterior na nuvem)
    // e temos o token configurado no .env, enriquecemos os posts com os dados reais de views
    const allViewsZero = posts.every((p) => (p.views || 0) === 0);
    const accessToken = import.meta.env.VITE_META_ACCESS_TOKEN as string | undefined;

    if (allViewsZero && accessToken) {
      const batchSize = 5;
      for (let i = 0; i < posts.length; i += batchSize) {
        const slice = posts.slice(i, i + batchSize);
        const insightPromises = slice.map((p) =>
          fetchPostInsights(p.id, p.mediaProductType || "", accessToken)
        );
        const insightResults = await Promise.all(insightPromises);
        for (let j = 0; j < slice.length; j++) {
          const p = slice[j];
          const ins = insightResults[j];
          p.reach = ins.reach || p.reach;
          p.views = ins.views || p.views;
          p.shares = ins.shares || p.shares;
          p.saved = ins.saved || p.saved;
          if (ins.totalInteractions > 0) p.totalInteractions = ins.totalInteractions;
          p.engagementRate =
            p.reach > 0
              ? Number(((p.totalInteractions / p.reach) * 100).toFixed(2))
              : summary.followersCount > 0
              ? Number(((p.totalInteractions / summary.followersCount) * 100).toFixed(2))
              : 0;
        }
      }

      // Recalcula totais do período
      const totalViews = posts.reduce((s, p) => s + p.views, 0);
      const totalReach = posts.reduce((s, p) => s + p.reach, 0);
      const totalShares = posts.reduce((s, p) => s + p.shares, 0);
      const totalInteractionsSum = posts.reduce((s, p) => s + p.totalInteractions, 0);
      const avgEngagementRate =
        totalReach > 0 ? (totalInteractionsSum / totalReach) * 100 : summary.avgEngagementRate;

      summary = {
        ...summary,
        totalViews,
        totalReach,
        totalShares,
        avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
      };
    }

    // Ordenação garantida por maior audiência (views > 0 ? views : reach)
    posts.sort((a, b) => {
      const scoreA = a.views > 0 ? a.views : a.reach;
      const scoreB = b.views > 0 ? b.views : b.reach;
      return scoreB - scoreA;
    });

    const result: InstagramFetchResult = {
      summary,
      posts,
      fromCache: false,
      timestamp: Date.now(),
    };
    const expiry = Date.now() + CACHE_TTL_MS;
    memoryCache.set(cacheKey, { data: result, expiry });
    try {
      sessionStorage.setItem(`ig_posts_collab_v4_${cacheKey}`, JSON.stringify({ data: result, expiry }));
    } catch {}
    return result;
  }

  // 3. Fallback gracioso para token de desenvolvimento local
  const accessToken = import.meta.env.VITE_META_ACCESS_TOKEN as string | undefined;
  if (!accessToken) {
    console.warn(
      "[MetaAPI] Edge function 'meta-proxy' não retornou dados e VITE_META_ACCESS_TOKEN não está presente no .env."
    );
    return null;
  }

  // 4. Busca perfil localmente
  const profile = await getInstagramProfile(accessToken);
  if (!profile) {
    console.warn("[MetaAPI] Nenhum Instagram Business vinculado encontrado.");
    return null;
  }

  try {
    // 3. Busca lista de mídias recentes
    const fields = [
      "id",
      "caption",
      "media_type",
      "media_product_type",
      "media_url",
      "permalink",
      "thumbnail_url",
      "timestamp",
      "like_count",
      "comments_count",
      "collaborators{username,invite_status}",
    ].join(",");

    let allMedia: any[] = [];
    let nextUrl: string | null = `${META_BASE_URL}/${profile.id}/media?fields=${fields}&limit=50&access_token=${accessToken}`;
    let pageCount = 0;

    // Busca até 2 páginas (100 posts) para cobrir o mês selecionado
    while (nextUrl && pageCount < 2) {
      const res: Response = await fetch(nextUrl);
      if (!res.ok) break;
      const json: any = await res.json();
      if (Array.isArray(json.data)) {
        allMedia.push(...json.data);
      }
      nextUrl = json.paging?.next || null;
      pageCount++;

      // Se já temos posts mais antigos que o mês solicitado, podemos parar a paginação
      if (month && allMedia.length > 0) {
        const lastPost = allMedia[allMedia.length - 1];
        if (lastPost.timestamp && String(lastPost.timestamp).slice(0, 7) < month) {
          break;
        }
      }
    }

    // 4. Filtra pelo mês se especificado (ex: "2026-09")
    const filteredRaw = month
      ? allMedia.filter((m) => String(m.timestamp || "").startsWith(month))
      : allMedia.slice(0, 30);

    // 5. Busca insights em lotes paralelos de 5 para não sobrecarregar
    const batchSize = 5;
    const posts: InstagramPost[] = [];

    for (let i = 0; i < filteredRaw.length; i += batchSize) {
      const slice = filteredRaw.slice(i, i + batchSize);
      const insightPromises = slice.map((m) =>
        fetchPostInsights(m.id, m.media_product_type || "", accessToken),
      );
      const insightResults = await Promise.all(insightPromises);

      for (let j = 0; j < slice.length; j++) {
        const m = slice[j];
        const ins = insightResults[j];
        const likes = Number(m.like_count) || 0;
        const comments = Number(m.comments_count) || 0;
        const shares = ins.shares || 0;
        const saved = ins.saved || 0;
        const reach = ins.reach || 0;
        const views = ins.views || 0;

        // Total interactions: likes + comments + shares + saves (ou do endpoint se maior)
        const calculatedInteractions = likes + comments + shares + saved;
        const totalInteractions = Math.max(ins.totalInteractions || 0, calculatedInteractions);
        const engagementRate = reach > 0 ? (totalInteractions / reach) * 100 : 0;

        // Processa colaboradores oficiais
        const rawCollabs = Array.isArray(m.collaborators?.data) ? m.collaborators.data : [];
        const collaborators: string[] = rawCollabs
          .map((c: any) => c.username)
          .filter(Boolean);
        const isCollab = collaborators.length > 0;

        posts.push({
          id: m.id,
          caption: m.caption || "",
          mediaType: normalizeMediaType(m.media_type, m.media_product_type),
          mediaProductType: m.media_product_type || "FEED",
          permalink: m.permalink || `https://instagram.com/p/${m.id}`,
          thumbnailUrl: m.thumbnail_url || m.media_url || "",
          mediaUrl: m.media_url || "",
          timestamp: m.timestamp || new Date().toISOString(),
          likes,
          comments,
          shares,
          saved,
          reach,
          views,
          totalInteractions,
          engagementRate,
          isCollab,
          collaborators,
        });
      }
    }

    // 6. Ordenação padrão: mais visualizados primeiro (para Reels, views; para feed, reach)
    posts.sort((a, b) => {
      const scoreA = a.views > 0 ? a.views : a.reach;
      const scoreB = b.views > 0 ? b.views : b.reach;
      return scoreB - scoreA;
    });

    // 7. Consolida resumo geral do período
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalReach = posts.reduce((s, p) => s + p.reach, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments, 0);
    const totalShares = posts.reduce((s, p) => s + p.shares, 0);
    const totalInteractionsSum = posts.reduce((s, p) => s + p.totalInteractions, 0);
    const avgEngagementRate = totalReach > 0 ? (totalInteractionsSum / totalReach) * 100 : 0;
    const totalCollabs = posts.filter((p) => p.isCollab).length;

    const summary: InstagramPeriodSummary = {
      followersCount: profile.followers_count || 69037,
      totalPosts: posts.length,
      totalCollabs,
      totalViews,
      totalReach,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate,
    };

    const result: InstagramFetchResult = {
      summary,
      posts,
      fromCache: false,
      timestamp: Date.now(),
    };

    // 8. Salva no cache com TTL de 15 minutos
    const expiry = Date.now() + CACHE_TTL_MS;
    memoryCache.set(cacheKey, { data: result, expiry });
    try {
      sessionStorage.setItem(`ig_posts_collab_v3_${cacheKey}`, JSON.stringify({ data: result, expiry }));
    } catch {}

    return result;
  } catch (err) {
    console.error("[MetaAPI] Falha ao buscar posts e insights:", err);
    return null;
  }
}
