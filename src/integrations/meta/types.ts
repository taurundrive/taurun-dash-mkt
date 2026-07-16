/**
 * Tipos TypeScript para a Meta (Facebook) Marketing API v20.0
 * Referência: https://developers.facebook.com/docs/marketing-api/insights
 */

// ── Estrutura de "actions" retornada por insights ───────────────────────────
export interface MetaAction {
  action_type: string;
  value: string;
}

// ── Um registro de insight diário por campanha ───────────────────────────────
export interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  date_start: string;   // "yyyy-mm-dd"
  date_stop: string;    // "yyyy-mm-dd"
  spend: string;        // valor em BRL como string
  clicks: string;       // total de cliques
  impressions: string;
  reach: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
}

// ── Paginação padrão da Graph API ────────────────────────────────────────────
export interface MetaPaging {
  cursors?: { before: string; after: string };
  next?: string;
}

// ── Resposta paginada genérica ───────────────────────────────────────────────
export interface MetaPagedResponse<T> {
  data: T[];
  paging?: MetaPaging;
  error?: MetaApiError;
}

// ── Resposta assíncrona de jobs (Async Insights API) ────────────────────────
export interface MetaAsyncJob {
  report_run_id: string;
}

// ── Erro padrão da API ───────────────────────────────────────────────────────
export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

// ── Ad Account mínimo (retornado por /me/adaccounts) ────────────────────────
export interface MetaAdAccount {
  id: string;           // ex: "act_123456789"
  name: string;
  currency: string;
  account_status: number; // 1 = ativo
}
