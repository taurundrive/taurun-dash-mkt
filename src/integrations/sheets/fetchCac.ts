/**
 * fetchCac.ts — Integração com Google Sheets (aba "Orçamentos Fechados")
 *
 * Retorna dados mensais para alimentar os campos do CAC:
 *   - closedSales  : quantidade de vendas fechadas no mês
 *   - paidRevenue  : receita total paga no mês (soma do "Total com Desconto")
 *   - phones       : telefones (somente dígitos) para matching com whatsapp_leads
 *
 * Matching de telefones usa os ÚLTIMOS 8 DÍGITOS de cada número para evitar
 * inconsistências de formato (ex: 55+DDD vs sem código de país).
 */

export interface MonthCacData {
  closedSales: number;
  paidRevenue: number;
  phones: string[]; // somente dígitos, ex: "11996000501"
  items?: Array<{ phone: string; phones?: string[]; amount: number; rowText?: string }>;
}

export interface SheetsCacResponse {
  sucesso: boolean;
  meses: Record<string, MonthCacData>; // chave: "YYYY-MM"
  atualizadoEm?: string;
  erro?: string;
}

// Cache em memória de 1 minuto (para refletir edições na planilha rapidamente sem sobrecarregar a API)
let cacCache: { data: SheetsCacResponse; timestamp: number } | null = null;
const CAC_CACHE_TTL_MS = 60 * 1000;

/**
 * Busca dados mensais de Orçamentos Fechados via Apps Script Web App.
 * Retorna null se a URL não estiver configurada ou houver falha.
 */
export async function fetchSheetsCAC(): Promise<SheetsCacResponse | null> {
  const url = import.meta.env.VITE_SHEETS_CAC_URL as string | undefined;

  if (!url || !url.startsWith("https://")) {
    return null;
  }

  // Retorna do cache se ainda válido
  if (cacCache && Date.now() - cacCache.timestamp < CAC_CACHE_TTL_MS) {
    return cacCache.data;
  }

  try {
    const separator = url.includes("?") ? "&" : "?";
    const cacheBusterUrl = `${url}${separator}_t=${Date.now()}`;
    const resp = await fetch(cacheBusterUrl, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const json: SheetsCacResponse = await resp.json();

    if (json && json.sucesso) {
      cacCache = { data: json, timestamp: Date.now() };
    }

    return json;
  } catch (err) {
    console.error("[SheetsCac] Erro ao buscar Orçamentos Fechados:", err);
    return cacCache?.data ?? null; // retorna cache antigo em caso de falha
  }
}

/**
 * Normaliza um número de telefone extraindo somente os dígitos
 * e retornando os últimos 8 caracteres para matching seguro.
 *
 * Exemplos:
 *   "+55 (11) 99634-70019" → "63470019"
 *   "5511963470019"        → "63470019"
 *   "(21) 98765-4321"      → "87654321"
 */
export function last8Digits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-8);
}
