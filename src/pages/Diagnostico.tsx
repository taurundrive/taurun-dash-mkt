/**
 * Diagnostico.tsx — Página de Diagnóstico de Tráfego & Media Buyer Insights
 *
 * Inspirado nas melhores práticas do repositório Varnan-Tech/meta-ads-skill:
 * - Resumo Executivo para diretoria com deltas percentuais coloridos discretamente
 * - Árvore de Causa-Raiz em 4 passos (Conta -> Campanha -> Conjuntos -> Criativos)
 * - Tabela analítica de fadiga criativa com alertas de saturação (frequência >= 3.5x)
 * - Integração total com o seletor de período global (usePeriodFilter) e campanhas do Meta Ads
 */

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ExecutiveSummaryCard } from "@/components/dashboard/diagnostico/ExecutiveSummaryCard";
import { TroubleshootingTree } from "@/components/dashboard/diagnostico/TroubleshootingTree";
import { CreativeFatigueTable } from "@/components/dashboard/diagnostico/CreativeFatigueTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import { useDashboardData } from "@/data/dataSource";
import {
  fetchAdDiagnostics,
  buildDiagnosticsFromCampaigns,
  filterCampaignsByObjective,
  DiagnosticsResult,
  DiagnosticObjectiveFilter,
} from "@/integrations/meta/fetchAdDiagnostics";
import {
  Activity,
  RefreshCw,
  Flame,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  FileText,
  GitBranch,
  Sparkles,
  MessageSquare,
  MousePointerClick,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

function DiagnosticoContent() {
  const { range, label } = usePeriodFilter();
  const { data: dashboardData, loading: dashLoading } = useDashboardData(range);

  // Filtro de objetivo: "whatsapp" como padrão ativo oficial da Taurun
  const [objectiveFilter, setObjectiveFilter] = useState<DiagnosticObjectiveFilter>("whatsapp");

  const [diagData, setDiagData] = useState<DiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Contagem de campanhas por objetivo para os badges do seletor
  const allCampaigns = useMemo(() => dashboardData?.campaigns || [], [dashboardData?.campaigns]);
  const waCount = useMemo(() => filterCampaignsByObjective(allCampaigns, "whatsapp").length, [allCampaigns]);
  const trafficCount = useMemo(() => filterCampaignsByObjective(allCampaigns, "traffic").length, [allCampaigns]);

  // Executa o cálculo e diagnóstico quando as campanhas, período ou filtro de objetivo mudarem
  const runDiagnostics = async (filter = objectiveFilter, isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const campaigns = dashboardData?.campaigns || [];
      const result = await fetchAdDiagnostics(range.start, range.end, campaigns, filter);
      setDiagData(result);
    } catch (err) {
      console.error("[Diagnostico] Erro ao calcular diagnósticos:", err);
      if (dashboardData?.campaigns) {
        setDiagData(buildDiagnosticsFromCampaigns(dashboardData.campaigns, filter));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!dashLoading) {
      runDiagnostics(objectiveFilter);
    }
  }, [dashLoading, dashboardData?.campaigns, range.start, range.end, objectiveFilter]);

  // Contadores rápidos para o cabeçalho
  const summaryBadges = useMemo(() => {
    if (!diagData) return null;

    const isTraffic = objectiveFilter === "traffic";
    const criticalCount = diagData.creatives.filter((c) => c.fatigueLevel === "critical").length;
    const warningCount = diagData.creatives.filter((c) => c.fatigueLevel === "warning").length;
    const metricLabel = isTraffic ? "CPC Atual" : "CPL Atual";
    const metricValue = diagData.executiveReport.metrics.cpl.value;
    const accountStatus = diagData.troubleshootingTree[0]?.status || "ok";

    return {
      isTraffic,
      criticalCount,
      warningCount,
      metricLabel,
      metricValue,
      accountStatus,
    };
  }, [diagData, objectiveFilter]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      {/* 1. Cabeçalho da Página com Ação de Sincronização */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-300" />
            <h2 className="text-sm font-medium text-muted-foreground">
              Diagnóstico de Tráfego & Media Buyer Insights — {label}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Troubleshooting automático, isolamento estrito de cliques vs conversas e detecção de fadiga criativa
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={loading || refreshing}
          onClick={() => runDiagnostics(objectiveFilter, true)}
          className="h-8 px-3 text-xs font-medium rounded-lg border-border hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5 text-muted-foreground", refreshing && "animate-spin")}
          />
          <span>{refreshing ? "Sincronizando..." : "Sincronizar análise"}</span>
        </Button>
      </div>

      {/* 2. Seletor Segmentado de Objetivo de Anúncios (Regra: Tráfego/Cliques vs WhatsApp) */}
      <div className="bg-[#0f0f12] border border-border rounded-xl p-2.5 sm:p-3 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-zinc-400 mr-1">
              Segmentar Objetivo:
            </span>

            {/* Opção 1: WhatsApp / Mensagens (Foco Principal ativo por padrão) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setObjectiveFilter("whatsapp")}
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-lg transition-all flex items-center gap-2 border",
                objectiveFilter === "whatsapp"
                  ? "bg-zinc-800 text-white border-emerald-500/40 shadow-sm"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp / Mensagens</span>
              <span className="text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                Foco Principal
              </span>
              <span className="text-[11px] text-zinc-400 tabular-nums">
                ({waCount})
              </span>
            </Button>

            {/* Opção 2: Tráfego & Cliques de Link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setObjectiveFilter("traffic")}
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-lg transition-all flex items-center gap-2 border",
                objectiveFilter === "traffic"
                  ? "bg-zinc-800 text-white border-sky-500/40 shadow-sm"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              )}
            >
              <MousePointerClick className="w-3.5 h-3.5 text-sky-400" />
              <span>Tráfego & Cliques de Link</span>
              <span className="text-[11px] text-zinc-400 tabular-nums">
                ({trafficCount})
              </span>
            </Button>

            {/* Opção 3: Visão Consolidada (Todas) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setObjectiveFilter("all")}
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-lg transition-all flex items-center gap-2 border",
                objectiveFilter === "all"
                  ? "bg-zinc-800 text-white border-zinc-600 shadow-sm"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Visão Consolidada (Todas)</span>
              <span className="text-[11px] text-zinc-400 tabular-nums">
                ({allCampaigns.length})
              </span>
            </Button>
          </div>

          {/* Dica da Regra de Negócio Aplicada */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 bg-zinc-900/60 border border-border/40 px-2.5 py-1 rounded-lg">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>
              {objectiveFilter === "whatsapp" &&
                "Analisando exclusivamente conversas de WhatsApp. Cliques de tráfego isolados para não distorcer o CPL real."}
              {objectiveFilter === "traffic" &&
                "Análise focada em cliques no link, CPC e CTR. Cliques não são somados a leads."}
              {objectiveFilter === "all" &&
                "Visão consolidada mantendo separação estrita entre conversas iniciadas e cliques de link."}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Loading State */}
      {loading || !diagData ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-24 bg-card border border-border/60 rounded-xl" />
            ))}
          </div>
          <Card className="h-72 bg-card border border-border/60 rounded-xl" />
          <Card className="h-80 bg-card border border-border/60 rounded-xl" />
        </div>
      ) : (
        <>
          {/* 4. Cards Rápidos de Alertas e Saúde */}
          {summaryBadges && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Saúde Geral da Conta */}
              <div className="bg-[#0f0f12] border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {summaryBadges.isTraffic ? "Eficiência de Tráfego" : "Saúde da Conta"}
                  </span>
                  <div className="text-base font-semibold text-zinc-100 flex items-center gap-1.5">
                    {summaryBadges.accountStatus === "ok" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Operação Estável</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Atenção aos Custos</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">
                    {summaryBadges.metricLabel}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-zinc-200">
                    {summaryBadges.metricValue}
                  </span>
                </div>
              </div>

              {/* Criativos em Fadiga Crítica */}
              <div className="bg-[#0f0f12] border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Fadiga de Criativos</span>
                  <div className="text-base font-semibold text-zinc-100 flex items-center gap-1.5">
                    {summaryBadges.criticalCount > 0 ? (
                      <>
                        <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{summaryBadges.criticalCount} Anúncio(s) Crítico(s)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Frequência Equilibrada</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Em Alerta</span>
                  <span className="text-sm font-bold tabular-nums text-zinc-200">
                    {summaryBadges.warningCount} criativo(s)
                  </span>
                </div>
              </div>

              {/* Eficiência da Campanha Principal */}
              <div className="bg-[#0f0f12] border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Campanhas Analisadas</span>
                  <div className="text-base font-semibold text-zinc-100 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{diagData.adsets.length} Conjuntos Mapeados</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Criativos Ativos</span>
                  <span className="text-sm font-bold tabular-nums text-zinc-200">
                    {diagData.creatives.length} anúncios
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Abas Principais de Diagnóstico */}
          <Tabs defaultValue="executivo" className="w-full space-y-4">
            <TabsList className="bg-zinc-900/90 border border-border p-1 rounded-xl h-auto flex flex-wrap w-fit">
              <TabsTrigger
                value="executivo"
                className="text-xs font-medium px-3.5 py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resumo Executivo</span>
              </TabsTrigger>

              <TabsTrigger
                value="causa-raiz"
                className="text-xs font-medium px-3.5 py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-1.5 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Árvore de Causa-Raiz</span>
              </TabsTrigger>

              <TabsTrigger
                value="fadiga"
                className="text-xs font-medium px-3.5 py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-1.5 transition-colors"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Fadiga de Criativos</span>
              </TabsTrigger>

              <TabsTrigger
                value="completo"
                className="text-xs font-medium px-3.5 py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Visão Completa</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: Resumo Executivo */}
            <TabsContent value="executivo" className="space-y-4 mt-0 focus-visible:outline-none">
              <ExecutiveSummaryCard
                report={diagData.executiveReport}
                periodLabel={label}
              />
            </TabsContent>

            {/* Aba 2: Árvore de Causa-Raiz */}
            <TabsContent value="causa-raiz" className="space-y-4 mt-0 focus-visible:outline-none">
              <TroubleshootingTree
                tree={diagData.troubleshootingTree}
                objectiveMode={objectiveFilter}
              />
            </TabsContent>

            {/* Aba 3: Fadiga de Criativos */}
            <TabsContent value="fadiga" className="space-y-4 mt-0 focus-visible:outline-none">
              <CreativeFatigueTable
                creatives={diagData.creatives}
                objectiveMode={objectiveFilter}
              />
            </TabsContent>

            {/* Aba 4: Visão Completa com Todos os Blocos */}
            <TabsContent value="completo" className="space-y-6 mt-0 focus-visible:outline-none">
              <ExecutiveSummaryCard
                report={diagData.executiveReport}
                periodLabel={label}
              />
              <TroubleshootingTree
                tree={diagData.troubleshootingTree}
                objectiveMode={objectiveFilter}
              />
              <CreativeFatigueTable
                creatives={diagData.creatives}
                objectiveMode={objectiveFilter}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default function Diagnostico() {
  return (
    <DashboardLayout title="Diagnóstico de Tráfego">
      <DiagnosticoContent />
    </DashboardLayout>
  );
}
