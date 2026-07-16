/**
 * fetchMetaCampaigns — converte insights da Meta API no formato Campaign[]
 * usado pelo dataSource.ts do dashboard.
 *
 * Mapeamento de campos (Meta → DashboardData):
 *   campaign_name  → Campaign.name
 *   objective      → inferido para CampaignType via inferType()
 *   date_start     → DailyCampaignPoint.date
 *   spend          → DailyCampaignPoint.invested
 *   clicks         → DailyCampaignPoint.clicks
 *   actions        → DailyCampaignPoint.leads  (veja LEAD_ACTION_TYPES)
 *
 * Documentação dos objectives:
 *   https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#fields
 *
 * Documentação dos action_types:
 *   https://developers.facebook.com/docs/marketing-api/insights/action-types
 */

import type { Campaign, CampaignType, DailyCampaignPoint } from "@/data/types";
import type { MetaAction, MetaInsightRow } from "./types";
import { fetchAdAccounts, fetchCampaignInsights } from "./client";

// ── Tipos de objetivo que mapeiam para "Conversas por mensagem iniciadas" ────
const CONVERSAS_OBJECTIVES = new Set([
  "outcome_engagement",
  "messages",
  "outcome_messages",
  "outcome_leads",
  "lead_generation",
]);

/**
 * Mapeia o campo `objective` retornado pela Meta para o tipo de campanha
 * usado internamente pelo dashboard.
 *
 * Referência: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/
 */
function inferType(objective: string | null | undefined, name: string): CampaignType {
  const o = (objective ?? "").toLowerCase();

  // Objetivos modernos da Graph API (outcome_*)
  if (CONVERSAS_OBJECTIVES.has(o)) return "Conversas por mensagem iniciadas";
  if (o === "link_clicks" || o === "outcome_traffic" || o === "traffic") return "Tráfego";
  if (o === "outcome_awareness" || o === "brand_awareness" || o === "reach") return "Alcance";

  // Fallback por palavra-chave em PT
  if (o.includes("mensagem") || o.includes("conversa")) return "Conversas por mensagem iniciadas";
  if (o.includes("alcance") || o.includes("reach")) return "Alcance";
  if (o.includes("engaj")) return "Engajamento";
  if (o.includes("tráfego") || o.includes("trafego") || o.includes("traffic")) return "Tráfego";
  if (o.includes("página") || o.includes("pagina") || o.includes("landing")) return "Visualizações da página de destino";

  // Heurística por nome da campanha
  const n = name.toLowerCase();
  if (n.includes("tatame") || n.includes("revestimento")) return "Conversas por mensagem iniciadas";

  return "Tráfego";
}

/**
 * Action types da Meta que contam como "resultado / lead" para cada
 * tipo de campanha:
 *
 * - Conversas: "onsite_conversion.messaging_conversation_started_7d"
 *              "onsite_conversion.messaging_first_reply"
 *              "lead"
 * - Tráfego:   "link_click" ou "landing_page_view"
 * - Alcance:   sem resultado claro — usa impressions como proxy
 *
 * Referência: https://developers.facebook.com/docs/marketing-api/insights/action-types
 */
const LEAD_ACTION_TYPES = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "lead",
]);

const TRAFFIC_ACTION_TYPES = new Set([
  "link_click",
  "landing_page_view",
]);

/**
 * Soma os "resultados" de um array de actions de acordo com o tipo de campanha.
 * Para campanhas de Conversas → conta ações de mensagem/lead.
 * Para Tráfego → conta cliques de link / visualizações de página de destino.
 */
function sumResults(actions: MetaAction[] | undefined, type: CampaignType): number {
  if (!actions || actions.length === 0) return 0;

  const targetSet =
    type === "Conversas por mensagem iniciadas"
      ? LEAD_ACTION_TYPES
      : TRAFFIC_ACTION_TYPES;

  return actions
    .filter((a) => targetSet.has(a.action_type))
    .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

// ── Função principal exportada ────────────────────────────────────────────────

/**
 * Busca todos os insights de campanhas de TODAS as contas de anúncio
 * vinculadas ao token, no intervalo de datas especificado.
 *
 * Se o token não estiver configurado, retorna array vazio com aviso no console.
 */
export async function fetchMetaCampaigns(
  since: string,
  until: string
): Promise<Campaign[]> {
  const token = import.meta.env.VITE_META_ACCESS_TOKEN as string | undefined;

  if (!token) {
    console.warn("[MetaCampaigns] VITE_META_ACCESS_TOKEN não configurado.");
    return [];
  }

  // 1. Descobre todas as contas de anúncio do token automaticamente
  const accounts = await fetchAdAccounts();
  const activeAccounts = accounts.filter((a) => a.account_status === 1);

  if (activeAccounts.length === 0) {
    console.warn("[MetaCampaigns] Nenhuma conta de anúncio ativa encontrada.");
    return [];
  }

  // 2. Busca insights de todas as contas em paralelo
  const allRowsNested = await Promise.all(
    activeAccounts.map((acc) =>
      fetchCampaignInsights({ accountId: acc.id, since, until }).catch((err) => {
        console.error(`[MetaCampaigns] Erro na conta ${acc.id}:`, err);
        return [] as MetaInsightRow[];
      })
    )
  );

  const allRows = allRowsNested.flat();

  if (allRows.length === 0) {
    console.info("[MetaCampaigns] Nenhum dado de insight retornado no período.");
    return [];
  }

  // 3. Agrupa por nome de campanha → constrói Campaign[]
  //    (uma campanha pode rodar em múltiplas contas ou AdSets)
  const byCampaign = new Map<
    string,
    { objective: string | null; daily: Map<string, DailyCampaignPoint> }
  >();

  for (const row of allRows) {
    const key = row.campaign_name;

    if (!byCampaign.has(key)) {
      byCampaign.set(key, { objective: row.objective ?? null, daily: new Map() });
    }

    const bucket = byCampaign.get(key)!;
    const type = inferType(bucket.objective, key);

    // Acumula métricas do dia (podem existir múltiplos AdSets/Contas por campanha/dia)
    const existing = bucket.daily.get(row.date_start) ?? {
      date: row.date_start,
      clicks: 0,
      leads: 0,
      invested: 0,
    };

    existing.clicks  += Number(row.clicks) || 0;
    existing.invested += Number(row.spend) || 0;
    existing.leads   += sumResults(row.actions, type);

    bucket.daily.set(row.date_start, existing);
  }

  // 4. Converte Map → Campaign[]
  const campaigns: Campaign[] = Array.from(byCampaign.entries()).map(
    ([name, info], i) => ({
      id: `meta-${i + 1}`,
      name,
      type: inferType(info.objective, name),
      daily: Array.from(info.daily.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    })
  );

  return campaigns;
}
