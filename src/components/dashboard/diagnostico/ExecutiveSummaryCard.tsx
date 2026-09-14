/**
 * ExecutiveSummaryCard.tsx — Card de Resumo Executivo da Diretoria
 *
 * Inspirado no padrão Varnan-Tech/meta-ads-skill (report_templates.md):
 * - 4 KPIs estratégicos consolidados (Investimento, Leads, CPL Médio, ROAS)
 * - Deltas comparativos discretos com indicação visual de melhora/piora
 * - Síntese analítica em parágrafos para tomada de decisão da liderança
 * - Destaques positivos, pontos de atenção e ações recomendadas
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  ArrowRightCircle,
  FileText,
  DollarSign,
  Users,
  Target,
  BarChart3,
  MousePointerClick,
  MessageSquare,
  Percent,
  Layers,
} from "lucide-react";
import type { ExecutiveReport, ExecutiveMetric, DiagnosticObjectiveFilter } from "@/integrations/meta/fetchAdDiagnostics";
import { cn } from "@/lib/utils";

export interface ExecutiveSummaryCardProps {
  report: ExecutiveReport;
  periodLabel?: string;
  className?: string;
}

/**
 * Mini-card individual para cada KPI de topo com indicador discreto de delta
 */
function MetricKpiBox({
  metric,
  icon: Icon,
  invertSentiment = false,
}: {
  metric: ExecutiveMetric;
  icon: React.ComponentType<{ className?: string }>;
  invertSentiment?: boolean;
}) {
  // Para CPL e CPC, delta negativo é bom (invertSentiment = true)
  const isPositive = invertSentiment ? metric.deltaPct <= 0 : metric.deltaPct >= 0;
  const isZero = metric.deltaPct === 0;

  return (
    <div className="bg-[#121215] border border-border/80 rounded-lg p-4 flex flex-col justify-between transition-colors hover:border-zinc-700">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground line-clamp-1">
          {metric.label}
        </span>
        <div className="w-7 h-7 rounded-md bg-zinc-800/80 border border-border/60 flex items-center justify-center text-zinc-400 shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-2xl font-bold tracking-tight tabular-nums text-zinc-100">
          {metric.value}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums border",
              isZero
                ? "bg-zinc-800/50 text-zinc-400 border-zinc-700/50"
                : isPositive
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                : "bg-rose-950/40 text-rose-400 border-rose-800/40"
            )}
          >
            {!isZero && (
              isPositive ? (
                <TrendingUp className="w-3 h-3 shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 shrink-0" />
              )
            )}
            <span>
              {metric.deltaPct > 0 ? `+${metric.deltaPct}%` : `${metric.deltaPct}%`}
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground/80">vs baseline</span>
        </div>
      </div>
    </div>
  );
}

export function ExecutiveSummaryCard({
  report,
  periodLabel,
  className,
}: ExecutiveSummaryCardProps) {
  const isTraffic = report.objectiveMode === "traffic";
  const isWhatsapp = report.objectiveMode === "whatsapp";

  return (
    <Card className={cn("bg-[#0f0f12] border-border text-card-foreground shadow-none", className)}>
      <CardHeader className="pb-4 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <CardTitle className="text-base sm:text-lg font-semibold text-zinc-100">
                {isTraffic
                  ? "Resumo Executivo — Tráfego & Cliques de Link"
                  : isWhatsapp
                  ? "Resumo Executivo — Conversas de WhatsApp"
                  : "Resumo Executivo da Diretoria (Consolidado)"}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {periodLabel
                ? `Análise de performance consolidada para o período de ${periodLabel}`
                : "Análise de performance consolidada e inteligência de mídia"}
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-[11px] font-medium border px-2.5 py-1 flex items-center gap-1.5",
              isTraffic
                ? "border-sky-800/50 bg-sky-950/40 text-sky-300"
                : isWhatsapp
                ? "border-emerald-800/50 bg-emerald-950/40 text-emerald-300"
                : "border-border bg-zinc-900/60 text-zinc-300"
            )}
          >
            {isTraffic ? (
              <>
                <MousePointerClick className="w-3 h-3 text-sky-400" />
                <span>Tráfego & Cliques (Meta Ads)</span>
              </>
            ) : isWhatsapp ? (
              <>
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp / Mensagens Diretas</span>
              </>
            ) : (
              <>
                <Layers className="w-3 h-3 text-zinc-400" />
                <span>Visão Consolidada (Todas)</span>
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* 1. Grade de 4 KPIs Estratégicos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricKpiBox
            metric={report.metrics.spend}
            icon={DollarSign}
          />
          <MetricKpiBox
            metric={report.metrics.leads}
            icon={isTraffic ? MousePointerClick : Users}
          />
          <MetricKpiBox
            metric={report.metrics.cpl}
            icon={isTraffic ? DollarSign : Target}
            invertSentiment={true} // CPL ou CPC menor é melhor
          />
          <MetricKpiBox
            metric={report.metrics.roas}
            icon={isTraffic ? Percent : BarChart3}
          />
        </div>

        {/* 2. Síntese Executiva em Parágrafos */}
        <div className="bg-[#121215] border border-border/70 rounded-lg p-4 sm:p-5 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            {isTraffic
              ? "Síntese Operacional de Tráfego & Cliques"
              : isWhatsapp
              ? "Síntese Operacional de WhatsApp & Conversões"
              : "Síntese Operacional Consolidada"}
          </div>
          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            {report.summaryParagraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* 3. Colunas de Análise: Destaques, Atenção e Ações Recomendadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Destaques Positivos (Status: Bom) */}
          <div className="bg-[#121215] border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-xs font-semibold uppercase tracking-wide">
                Destaques Positivos
              </h4>
            </div>
            <ul className="space-y-2">
              {report.keyHighlights.map((highlight, idx) => (
                <li
                  key={idx}
                  className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 mt-1.5 shrink-0" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pontos de Atenção (Status: Atenção) */}
          <div className="bg-[#121215] border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <h4 className="text-xs font-semibold uppercase tracking-wide">
                Pontos de Atenção
              </h4>
            </div>
            <ul className="space-y-2">
              {report.attentionPoints.map((point, idx) => (
                <li
                  key={idx}
                  className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 mt-1.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ações Recomendadas (Monocromático sóbrio) */}
          <div className="bg-[#121215] border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <ArrowRightCircle className="w-4 h-4 text-zinc-400 shrink-0" />
              <h4 className="text-xs font-semibold uppercase tracking-wide">
                Ações Recomendadas
              </h4>
            </div>
            <ul className="space-y-2">
              {report.recommendedActions.map((action, idx) => (
                <li
                  key={idx}
                  className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
