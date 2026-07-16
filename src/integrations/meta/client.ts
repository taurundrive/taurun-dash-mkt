/**
 * Meta (Facebook) Graph API — cliente base
 *
 * Responsável por:
 * - Ler o token de acesso do .env (VITE_META_ACCESS_TOKEN)
 * - Descobrir automaticamente as contas de anúncio vinculadas ao token
 * - Executar requisições paginadas à Graph API v20.0
 *
 * Documentação: https://developers.facebook.com/docs/graph-api/overview
 */

import type {
  MetaAdAccount,
  MetaPagedResponse,
  MetaInsightRow,
} from "./types";

// Versão da API usada em todas as chamadas
const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Token de acesso — injetado pelo Vite via .env (VITE_META_ACCESS_TOKEN)
const ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN as string;

// ── Utilitário interno: GET com paginação automática ─────────────────────────
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | undefined = url;
  let pages = 0;
  const MAX_PAGES = 5; // Limite de 5 páginas (até 2500 registros) para garantir velocidade na tela

  while (nextUrl && pages < MAX_PAGES) {
    const resp = await fetch(nextUrl);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`[MetaAPI] HTTP ${resp.status}: ${text}`);
    }

    const json: MetaPagedResponse<T> = await resp.json();

    if (json.error) {
      throw new Error(`[MetaAPI] ${json.error.type}: ${json.error.message}`);
    }

    results.push(...(json.data ?? []));
    pages++;

    // Se houver próxima página, continua; caso contrário, encerra o loop
    nextUrl = json.paging?.next;
  }

  return results;
}

// Cache em memória para contas de anúncio (evita requisição de descoberta a cada filtro)
let cachedAccounts: MetaAdAccount[] | null = null;

// ── Busca todas as contas de anúncio do token ─────────────────────────────────
export async function fetchAdAccounts(): Promise<MetaAdAccount[]> {
  if (cachedAccounts) return cachedAccounts;

  const url =
    `${META_BASE_URL}/me/adaccounts` +
    `?fields=id,name,currency,account_status` +
    `&access_token=${ACCESS_TOKEN}` +
    `&limit=50`;

  const accounts = await fetchAllPages<MetaAdAccount>(url);
  cachedAccounts = accounts;
  return accounts;
}

// ── Opções para busca de insights ────────────────────────────────────────────
export interface InsightsOptions {
  accountId: string;  // ex: "act_123456789"
  since: string;      // "yyyy-mm-dd"
  until: string;      // "yyyy-mm-dd"
}

/**
 * Busca insights diários de todas as campanhas da conta.
 *
 * Campos solicitados:
 *   - campaign_id, campaign_name, objective  → identidade da campanha
 *   - date_start, date_stop                 → granularidade diária
 *   - spend                                 → investimento (R$)
 *   - clicks                                → total de cliques
 *   - impressions, reach                    → alcance
 *   - actions                               → resultados (mensagens, cliques de link, etc.)
 *
 * Referência: https://developers.facebook.com/docs/marketing-api/insights/fields
 */
export async function fetchCampaignInsights(
  opts: InsightsOptions
): Promise<MetaInsightRow[]> {
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

  // time_increment=1 → retorna um ponto por dia
  const url =
    `${META_BASE_URL}/${opts.accountId}/insights` +
    `?fields=${fields}` +
    `&level=campaign` +
    `&time_increment=1` +
    `&time_range=${encodeURIComponent(JSON.stringify({ since: opts.since, until: opts.until }))}` +
    `&access_token=${ACCESS_TOKEN}` +
    `&limit=500`;

  return fetchAllPages<MetaInsightRow>(url);
}
