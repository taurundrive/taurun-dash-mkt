import { Campaign, DashboardData, DailyCampaignPoint, MonthlyCacRow, SalesPoint } from "./types";

/**
 * Mock data source. Same shape we expect from the n8n webhook.
 * Replace `getDashboardData` body with a fetch when integration is ready.
 */

const CAMPAIGN_DEFS: Array<{ name: string; type: Campaign["type"]; baseClicks: number; baseLeads: number; baseInvested: number }> = [
  { name: "EASYROLL - DIVULGAÇÃO 1", type: "Visualizações da página de destino", baseClicks: 1500, baseLeads: 1250, baseInvested: 65 },
  { name: "TATAME DO ZERO - MG - FERNANDO", type: "Conversas por mensagem iniciadas", baseClicks: 22, baseLeads: 4, baseInvested: 62 },
  { name: "REVESTIMENTO - DF - FERNANDO", type: "Conversas por mensagem iniciadas", baseClicks: 21, baseLeads: 4, baseInvested: 63 },
  { name: "TATAME DO ZERO - SP - FERNANDO", type: "Conversas por mensagem iniciadas", baseClicks: 20, baseLeads: 5, baseInvested: 62 },
  { name: "CRIATIVOS VALIDADOS EASYROLL", type: "Alcance", baseClicks: 17, baseLeads: 13000, baseInvested: 16 },
  { name: "REVESTIMENTO - SC - ROBERTO", type: "Conversas por mensagem iniciadas", baseClicks: 12, baseLeads: 1.5, baseInvested: 28 },
  { name: "TATAME DO ZERO - RJ - ROBERTO", type: "Conversas por mensagem iniciadas", baseClicks: 14, baseLeads: 2, baseInvested: 30 },
  { name: "EASYROLL - INSTITUCIONAL", type: "Engajamento", baseClicks: 80, baseLeads: 25, baseInvested: 45 },
  { name: "REVESTIMENTO - PR - ANA", type: "Tráfego", baseClicks: 35, baseLeads: 8, baseInvested: 35 },
  { name: "TATAME PRO - NACIONAL", type: "Conversas por mensagem iniciadas", baseClicks: 18, baseLeads: 3, baseInvested: 40 },
];

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(start: Date, end: Date, base: { baseClicks: number; baseLeads: number; baseInvested: number }, seed: number): DailyCampaignPoint[] {
  const rand = seededRandom(seed);
  const points: DailyCampaignPoint[] = [];
  const day = new Date(start);
  while (day <= end) {
    const variance = 0.6 + rand() * 0.9; // 0.6x – 1.5x
    points.push({
      date: fmtIsoDate(day),
      clicks: Math.max(0, Math.round(base.baseClicks * variance)),
      leads: Math.max(0, Math.round(base.baseLeads * variance)),
      invested: Math.round(base.baseInvested * variance * 100) / 100,
    });
    day.setDate(day.getDate() + 1);
  }
  return points;
}

/** Generate ~6 months of daily data ending at a fixed reference date */
const REFERENCE_END = new Date("2026-04-30");
const REFERENCE_START = new Date("2025-11-01");

const campaigns: Campaign[] = CAMPAIGN_DEFS.map((def, i) => ({
  id: `c-${i + 1}`,
  name: def.name,
  type: def.type,
  daily: buildDailySeries(REFERENCE_START, REFERENCE_END, def, (i + 1) * 9301),
}));

/** Daily sales — biased to higher amounts later in the period */
const sales: SalesPoint[] = (() => {
  const out: SalesPoint[] = [];
  const rand = seededRandom(42);
  const day = new Date(REFERENCE_START);
  let i = 0;
  while (day <= REFERENCE_END) {
    const trend = 1 + i / 200;
    const amount = Math.round((4000 + rand() * 22000) * trend);
    out.push({ date: fmtIsoDate(day), amount });
    day.setDate(day.getDate() + 1);
    i++;
  }
  return out;
})();

/** Monthly CAC table — uses the user's actual numbers for 2/3/4 2026 */
const cacMonthly: MonthlyCacRow[] = [
  { monthIso: "2025-11", label: "11/2025", invested: 18430.5, paidLeads: 142, closedSales: 14 },
  { monthIso: "2025-12", label: "12/2025", invested: 22150.8, paidLeads: 178, closedSales: 21 },
  { monthIso: "2026-01", label: "1/2026",  invested: 19880.2, paidLeads: 156, closedSales: 18 },
  { monthIso: "2026-02", label: "2/2026",  invested: 0,       paidLeads: 4,   closedSales: 2  },
  { monthIso: "2026-03", label: "3/2026",  invested: 21033.51, paidLeads: 165, closedSales: 16 },
  { monthIso: "2026-04", label: "4/2026",  invested: 12924.85, paidLeads: 74,  closedSales: 29 },
  { monthIso: "2026-05", label: "5/2026",  invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-06", label: "6/2026",  invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-07", label: "7/2026",  invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-08", label: "8/2026",  invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-09", label: "9/2026",  invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-10", label: "10/2026", invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-11", label: "11/2026", invested: 0,       paidLeads: 0,   closedSales: 0  },
  { monthIso: "2026-12", label: "12/2026", invested: 0,       paidLeads: 0,   closedSales: 0  },
];

export const mockDashboardData: DashboardData = { campaigns, sales, cacMonthly };

export function getDashboardData(): DashboardData {
  // Future: fetch from Lovable Cloud / n8n webhook here.
  return mockDashboardData;
}