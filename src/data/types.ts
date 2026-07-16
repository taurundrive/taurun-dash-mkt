export type CampaignType =
  | "Conversas por mensagem iniciadas"
  | "Visualizações da página de destino"
  | "Alcance"
  | "Engajamento"
  | "Tráfego";

export interface DailyCampaignPoint {
  date: string; // ISO yyyy-mm-dd
  clicks: number;
  leads: number;
  invested: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  daily: DailyCampaignPoint[];
}

export interface SalesPoint {
  date: string;
  amount: number;
}

export interface MonthlyCacRow {
  monthIso: string; // yyyy-mm
  label: string;    // "2/2026"
  invested: number;
  totalInvested?: number; // soma de TODAS as campanhas de tráfego pago (todos os objetivos)
  paidLeads: number;
  closedSales: number;
  leadsClosedSales?: number;
  paidRevenue?: number;       // Faturamento do tráfego pago
  generalAvgTicket?: number;  // Ticket médio de vendas gerais
}

export interface DashboardData {
  campaigns: Campaign[];
  sales: SalesPoint[];
  cacMonthly: MonthlyCacRow[];
  waLeadDates?: string[]; // datas (yyyy-mm-dd) dos leads do WhatsApp — fonte da verdade
}