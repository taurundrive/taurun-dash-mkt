/**
 * diagnostics.test.tsx — Testes Unitários de Diagnóstico de Tráfego & Media Buyer Insights
 *
 * Valida:
 * 1. Regra nos dados: sumLeads e sumClicks (apenas conversas contam como leads, cliques vão para clicks)
 * 2. Isolamento de campanha de tráfego com 160.822 cliques (não infla leads nem distorce CPL)
 * 3. Heurística de Fadiga Criativa (evaluateFatigue) para WhatsApp e Tráfego
 * 4. Filtro de Objetivo (filterCampaignsByObjective: whatsapp, traffic, all)
 * 5. Gerador de Diagnósticos (buildDiagnosticsFromCampaigns nos 3 modos)
 * 6. Renderização dos componentes visuais (ExecutiveSummaryCard, TroubleshootingTree, CreativeFatigueTable)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  evaluateFatigue,
  buildDiagnosticsFromCampaigns,
  filterCampaignsByObjective,
  DiagnosticsResult,
} from "@/integrations/meta/fetchAdDiagnostics";
import { sumLeads, sumClicks } from "@/integrations/meta/fetchCampaigns";
import { ExecutiveSummaryCard } from "@/components/dashboard/diagnostico/ExecutiveSummaryCard";
import { TroubleshootingTree } from "@/components/dashboard/diagnostico/TroubleshootingTree";
import { CreativeFatigueTable } from "@/components/dashboard/diagnostico/CreativeFatigueTable";
import type { Campaign } from "@/data/types";
import type { MetaAction } from "@/integrations/meta/types";

// Campanhas mockadas para testes determinísticos
const mockCampaigns: Campaign[] = [
  {
    id: "camp_wa",
    name: "[WHATSAPP] Campanha Tatames Brasil — Conversas",
    type: "Conversas por mensagem iniciadas",
    daily: [
      { date: "2026-09-01", clicks: 120, leads: 25, invested: 250 },
      { date: "2026-09-02", clicks: 110, leads: 20, invested: 240 },
      { date: "2026-09-03", clicks: 90, leads: 15, invested: 260 },
      { date: "2026-09-04", clicks: 80, leads: 10, invested: 270 },
    ],
  },
  {
    id: "camp_traffic",
    name: "EASYROLL - DIVULGAÇÃO - AGOSTO",
    type: "Tráfego",
    daily: [
      { date: "2026-09-01", clicks: 40000, leads: 0, invested: 3000 },
      { date: "2026-09-02", clicks: 40000, leads: 0, invested: 3000 },
      { date: "2026-09-03", clicks: 40000, leads: 0, invested: 3000 },
      { date: "2026-09-04", clicks: 40822, leads: 0, invested: 3000 },
    ],
  },
];

describe("1. Regra de Dados: sumLeads e sumClicks (Meta API)", () => {
  it("soma estritamente conversas reais iniciadas como leads", () => {
    const actions: MetaAction[] = [
      { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "14" },
      { action_type: "onsite_conversion.messaging_first_reply", value: "12" },
      { action_type: "lead", value: "5" },
    ];
    // 14 + 12 + 5 = 31
    expect(sumLeads(actions)).toBe(31);
  });

  it("garante que cliques de link (link_click) NÃO sejam computados como leads", () => {
    const trafficActions: MetaAction[] = [
      { action_type: "link_click", value: "160822" },
      { action_type: "landing_page_view", value: "120500" },
      { action_type: "post_engagement", value: "18000" },
    ];

    // O total de leads deve ser 0! Nunca 160.822!
    expect(sumLeads(trafficActions)).toBe(0);

    // E os cliques são computados em clicks
    expect(sumClicks(trafficActions, 0)).toBe(281322);
    // Se o directClicks já for fornecido pela API, preserva directClicks
    expect(sumClicks(trafficActions, 160822)).toBe(160822);
  });
});

describe("2. Heurística de Fadiga Criativa (evaluateFatigue)", () => {
  it("classifica como 'critical' para WhatsApp quando frequência >= 4.0 e CTR < 1.2", () => {
    const res = evaluateFatigue(4.5, 0.8, 10, 300, false);
    expect(res.level).toBe("critical");
    expect(res.reason).toContain("Frequência saturada");
    expect(res.action).toContain("Pausar criativo");
  });

  it("classifica como 'warning' quando frequência >= 3.4", () => {
    const res = evaluateFatigue(3.6, 1.8, 15, 200, false);
    expect(res.level).toBe("warning");
    expect(res.reason).toContain("Frequência em elevação");
  });

  it("avalia criativos de tráfego sem penalizar por ausência de leads (critério CTR e frequência)", () => {
    // Campanha de tráfego com frequência baixa e CTR saudável é 'healthy' mesmo com leads = 0
    const resTraffic = evaluateFatigue(2.2, 2.1, 0, 500, true);
    expect(resTraffic.level).toBe("healthy");
    expect(resTraffic.reason).toContain("Frequência controlada");

    // Campanha de tráfego com alta frequência e baixo CTR vira 'critical'
    const resTrafficCrit = evaluateFatigue(4.2, 0.75, 0, 500, true);
    expect(resTrafficCrit.level).toBe("critical");
  });
});

describe("3. Filtro de Objetivo (filterCampaignsByObjective)", () => {
  it("filtra apenas campanhas de WhatsApp quando o filtro for 'whatsapp'", () => {
    const filtered = filterCampaignsByObjective(mockCampaigns, "whatsapp");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("camp_wa");
    expect(filtered[0].type).toBe("Conversas por mensagem iniciadas");
  });

  it("filtra apenas campanhas de Tráfego quando o filtro for 'traffic'", () => {
    const filtered = filterCampaignsByObjective(mockCampaigns, "traffic");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("camp_traffic");
    expect(filtered[0].name).toContain("EASYROLL");
  });

  it("retorna todas as campanhas quando o filtro for 'all'", () => {
    const filtered = filterCampaignsByObjective(mockCampaigns, "all");
    expect(filtered).toHaveLength(2);
  });
});

describe("4. Gerador de Diagnósticos (buildDiagnosticsFromCampaigns)", () => {
  it("no modo WhatsApp: exclui 160.822 cliques de tráfego e mantém CPL real e saudável", () => {
    const result: DiagnosticsResult = buildDiagnosticsFromCampaigns(mockCampaigns, "whatsapp");

    expect(result.objectiveMode).toBe("whatsapp");
    expect(result.executiveReport.objectiveMode).toBe("whatsapp");

    // Total de leads deve ser estritamente 70 (25 + 20 + 15 + 10) e NÃO 160.892!
    expect(result.executiveReport.metrics.leads.raw).toBe(70);
    expect(result.executiveReport.metrics.leads.label).toBe("Leads de WhatsApp");

    // Investimento em WhatsApp: 250 + 240 + 260 + 270 = R$ 1020,00
    expect(result.executiveReport.metrics.spend.raw).toBe(1020);

    // CPL real: 1020 / 70 = R$ 14.57 (e NÃO R$ 0.14!)
    expect(result.executiveReport.metrics.cpl.raw).toBeCloseTo(14.57, 1);
    expect(result.executiveReport.metrics.cpl.label).toBe("CPL Médio (WhatsApp)");

    // Árvore de Causa-Raiz tem 4 passos com foco em WhatsApp
    expect(result.troubleshootingTree).toHaveLength(4);
    expect(result.troubleshootingTree[0].title).toContain("Conversas WhatsApp");
  });

  it("no modo Tráfego: foca em Cliques, CPC Médio e CTR sem inflar leads", () => {
    const result: DiagnosticsResult = buildDiagnosticsFromCampaigns(mockCampaigns, "traffic");

    expect(result.objectiveMode).toBe("traffic");
    expect(result.executiveReport.objectiveMode).toBe("traffic");

    // No modo tráfego, a métrica de resultado são os cliques (160.822)
    expect(result.executiveReport.metrics.leads.label).toBe("Cliques no Link");
    expect(result.executiveReport.metrics.leads.raw).toBe(160822);

    // E o custo por clique (CPC): 12000 / 160822 = ~R$ 0.07
    expect(result.executiveReport.metrics.cpl.label).toBe("CPC Médio (Tráfego)");
    expect(result.executiveReport.metrics.cpl.raw).toBeCloseTo(0.07, 2);

    // Árvore de Causa-Raiz foca em CPC e Eficiência de Tráfego
    expect(result.troubleshootingTree).toHaveLength(4);
    expect(result.troubleshootingTree[0].title).toContain("Tráfego & Cliques");
    expect(result.troubleshootingTree[0].metricLabel).toContain("CPC");
  });
});

describe("5. Componentes Visuais com Adaptação por Objetivo", () => {
  it("renderiza ExecutiveSummaryCard no modo WhatsApp com labels e badges de conversão", () => {
    const result = buildDiagnosticsFromCampaigns(mockCampaigns, "whatsapp");

    render(
      <ExecutiveSummaryCard
        report={result.executiveReport}
        periodLabel="Setembro 2026"
      />
    );

    expect(screen.getByText("Resumo Executivo — Conversas de WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp / Mensagens Diretas")).toBeInTheDocument();
    expect(screen.getByText("Investimento em WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Leads de WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("CPL Médio (WhatsApp)")).toBeInTheDocument();
    expect(screen.getByText("Síntese Operacional de WhatsApp & Conversões")).toBeInTheDocument();
  });

  it("renderiza ExecutiveSummaryCard no modo Tráfego com labels e badges de cliques", () => {
    const result = buildDiagnosticsFromCampaigns(mockCampaigns, "traffic");

    render(
      <ExecutiveSummaryCard
        report={result.executiveReport}
        periodLabel="Setembro 2026"
      />
    );

    expect(screen.getByText("Resumo Executivo — Tráfego & Cliques de Link")).toBeInTheDocument();
    expect(screen.getByText("Tráfego & Cliques (Meta Ads)")).toBeInTheDocument();
    expect(screen.getByText("Investimento em Tráfego")).toBeInTheDocument();
    expect(screen.getByText("Cliques no Link")).toBeInTheDocument();
    expect(screen.getByText("CPC Médio (Tráfego)")).toBeInTheDocument();
    expect(screen.getByText("Síntese Operacional de Tráfego & Cliques")).toBeInTheDocument();
  });

  it("renderiza TroubleshootingTree com 4 passos no modo WhatsApp", () => {
    const result = buildDiagnosticsFromCampaigns(mockCampaigns, "whatsapp");

    render(
      <TroubleshootingTree
        tree={result.troubleshootingTree}
        objectiveMode="whatsapp"
      />
    );

    expect(
      screen.getByText("Árvore de Causa-Raiz (Troubleshooting de CPL Spike — WhatsApp)")
    ).toBeInTheDocument();
    expect(screen.getByText(/1\. Nível da Conta/)).toBeInTheDocument();
    expect(screen.getAllByText("Diagnóstico da Causa-Raiz").length).toBe(4);
  });

  it("renderiza TroubleshootingTree no modo Tráfego com título de CPC Spike", () => {
    const result = buildDiagnosticsFromCampaigns(mockCampaigns, "traffic");

    render(
      <TroubleshootingTree
        tree={result.troubleshootingTree}
        objectiveMode="traffic"
      />
    );

    expect(
      screen.getByText("Árvore de Causa-Raiz (Troubleshooting de CPC Spike & Tráfego)")
    ).toBeInTheDocument();
    expect(screen.getByText(/4 Passos · Eficiência de Tráfego/)).toBeInTheDocument();
  });

  it("renderiza CreativeFatigueTable com colunas adaptadas para WhatsApp e Tráfego", () => {
    const resultWa = buildDiagnosticsFromCampaigns(mockCampaigns, "whatsapp");
    const { unmount } = render(
      <CreativeFatigueTable creatives={resultWa.creatives} objectiveMode="whatsapp" />
    );

    expect(screen.getByText("Leads (Whats)")).toBeInTheDocument();
    expect(screen.getByText("CPL (Whats)")).toBeInTheDocument();
    unmount();

    const resultTraffic = buildDiagnosticsFromCampaigns(mockCampaigns, "traffic");
    render(
      <CreativeFatigueTable creatives={resultTraffic.creatives} objectiveMode="traffic" />
    );

    expect(screen.getByText("Cliques")).toBeInTheDocument();
    expect(screen.getByText("CPC")).toBeInTheDocument();
  });
});
