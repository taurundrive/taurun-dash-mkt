/**
 * fetchSales.ts — Integração com Google Sheets (via Google Apps Script Web App)
 *
 * Busca a soma da coluna "REALIZADO" da planilha de vendas em tempo real.
 */

export interface VendedorRow {
  nome: string;
  meta: number;
  realizado: number;
  taxaConversao: number | null;
}

export interface SheetsSalesResponse {
  sucesso: boolean;
  mesIso: string;         // ex: "2026-07-01"
  totalVendas: number;    // ex: 314747.54
  vendedores: VendedorRow[];
  atualizadoEm: string;
}

// Cache em memória de 2 minutos para não travar na resposta/redirect do Google Sheets a cada filtro
let sheetsCache: { data: SheetsSalesResponse; timestamp: number } | null = null;
const SHEETS_CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * Busca o total de vendas diretamente do Google Apps Script configurado no .env.
 * Retorna null se a URL não estiver configurada ou houver falha.
 */
export async function fetchSheetsSales(): Promise<SheetsSalesResponse | null> {
  const url = import.meta.env.VITE_SHEETS_WEB_APP_URL as string | undefined;

  if (!url || !url.startsWith("https://")) {
    return null;
  }

  if (sheetsCache && Date.now() - sheetsCache.timestamp < SHEETS_CACHE_TTL_MS) {
    return sheetsCache.data;
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const json: SheetsSalesResponse = await resp.json();
    if (json && json.sucesso) {
      sheetsCache = { data: json, timestamp: Date.now() };
    }
    return json;
  } catch (err) {
    console.error("[SheetsSales] Erro ao buscar vendas da planilha:", err);
    return sheetsCache?.data ?? null;
  }
}
