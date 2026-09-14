/**
 * TroubleshootingTree.tsx — Árvore de Causa-Raiz (Troubleshooting de CPL Spike)
 *
 * Implementa o workflow sistemático em 4 níveis do repositório Varnan-Tech/meta-ads-skill:
 * 1. Nível Conta (Diagnóstico macro de estabilidade e CPL médio)
 * 2. Nível Campanha (Identificação de campanhas ofensoras com estouro de custo)
 * 3. Nível Conjunto de Anúncios (Avaliação de saturação e frequência do público)
 * 4. Nível Criativo (Detecção individual de fadiga do anúncio e CTR)
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Megaphone,
  Users,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  HelpCircle,
  GitBranch,
} from "lucide-react";
import type { TroubleshootingNode, DiagnosticObjectiveFilter } from "@/integrations/meta/fetchAdDiagnostics";
import { cn } from "@/lib/utils";

export interface TroubleshootingTreeProps {
  tree: TroubleshootingNode[];
  objectiveMode?: DiagnosticObjectiveFilter;
  className?: string;
}

/**
 * Retorna o ícone do nível hierárquico na árvore
 */
function getLevelIcon(level: TroubleshootingNode["level"]) {
  switch (level) {
    case "account":
      return Layers;
    case "campaign":
      return Megaphone;
    case "adset":
      return Users;
    case "ad":
      return ImageIcon;
    default:
      return GitBranch;
  }
}

/**
 * Retorna os estilos visuais de acordo com a severidade do nó
 */
function getStatusConfig(status: TroubleshootingNode["status"]) {
  switch (status) {
    case "critical":
      return {
        badgeText: "Gargalo Crítico",
        badgeClass: "bg-rose-950/40 text-rose-300 border-rose-800/50",
        nodeDotClass: "border-rose-500 text-rose-400 bg-zinc-950",
        icon: AlertOctagon,
        iconColor: "text-rose-400",
      };
    case "warning":
      return {
        badgeText: "Ponto de Atenção",
        badgeClass: "bg-amber-950/40 text-amber-300 border-amber-800/50",
        nodeDotClass: "border-amber-500 text-amber-400 bg-zinc-950",
        icon: AlertTriangle,
        iconColor: "text-amber-400",
      };
    case "ok":
    default:
      return {
        badgeText: "Saudável / Estável",
        badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
        nodeDotClass: "border-emerald-500 text-emerald-400 bg-zinc-950",
        icon: CheckCircle2,
        iconColor: "text-emerald-400",
      };
  }
}

export function TroubleshootingTree({ tree, objectiveMode, className }: TroubleshootingTreeProps) {
  const isTraffic = objectiveMode === "traffic";
  const isWhatsapp = objectiveMode === "whatsapp";

  return (
    <Card className={cn("bg-[#0f0f12] border-border text-card-foreground shadow-none", className)}>
      <CardHeader className="pb-4 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-zinc-400" />
              <CardTitle className="text-base sm:text-lg font-semibold text-zinc-100">
                {isTraffic
                  ? "Árvore de Causa-Raiz (Troubleshooting de CPC Spike & Tráfego)"
                  : isWhatsapp
                  ? "Árvore de Causa-Raiz (Troubleshooting de CPL Spike — WhatsApp)"
                  : "Árvore de Causa-Raiz (Troubleshooting de CPL/CPA Spike)"}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {isTraffic
                ? "Workflow analítico de 4 passos: isolamento descendente da conta ao criativo para estancar elevação de CPC e perda de CTR em campanhas de tráfego."
                : isWhatsapp
                ? "Workflow analítico de 4 passos: isolamento descendente da conta ao criativo para estancar estouros de CPL em conversas de WhatsApp."
                : "Workflow analítico de 4 passos: isolamento descendente da conta ao criativo para estancar estouros de custo."}
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className="text-[11px] font-medium border-border bg-zinc-900/60 text-zinc-300 px-2.5 py-1"
          >
            {isTraffic ? "4 Passos · Eficiência de Tráfego" : "4 Passos de Isolamento"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Árvore / Linha conectora vertical */}
        <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-800">
          {tree.map((node, index) => {
            const LevelIcon = getLevelIcon(node.level);
            const statusConfig = getStatusConfig(node.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={`${node.level}-${index}`} className="relative group">
                {/* Marcador do Nó na Linha Conectora */}
                <div
                  className={cn(
                    "absolute -left-6 sm:-left-10 top-3.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-sm transition-transform duration-150 group-hover:scale-105",
                    statusConfig.nodeDotClass
                  )}
                >
                  <span className="tabular-nums">{index + 1}</span>
                </div>

                {/* Card do Passo */}
                <div className="bg-[#121215] border border-border/80 rounded-xl p-4 sm:p-5 transition-colors hover:border-zinc-700 space-y-3.5">
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-1.5 py-0.5 bg-zinc-800/60 rounded border border-border/40">
                          Passo {index + 1} · {node.level.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <LevelIcon className="w-3.5 h-3.5" />
                          <span>{node.subtitle}</span>
                        </div>
                      </div>
                      <h4 className="text-sm sm:text-base font-semibold text-zinc-100">
                        {node.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-medium border flex items-center gap-1 py-1 px-2.5", statusConfig.badgeClass)}
                      >
                        <StatusIcon className="w-3 h-3 shrink-0" />
                        <span>{statusConfig.badgeText}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Faixa de Métricas e Baseline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-zinc-900/80 border border-border/50 rounded-lg p-2.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{node.metricLabel}</span>
                      <span className="text-sm font-bold tabular-nums text-zinc-100">
                        {node.metricValue}
                      </span>
                    </div>

                    <div className="bg-zinc-900/80 border border-border/50 rounded-lg p-2.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Contexto / Variação</span>
                      <span className="text-xs font-semibold tabular-nums text-zinc-300">
                        {node.deltaText}
                      </span>
                    </div>
                  </div>

                  {/* Diagnóstico da Causa-Raiz */}
                  <div className="bg-zinc-900/40 border border-border/60 rounded-lg p-3 sm:p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Diagnóstico da Causa-Raiz</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {node.diagnosis}
                    </p>
                  </div>

                  {/* Ação Recomendada Tática */}
                  <div className="bg-zinc-900/60 border border-sky-900/30 rounded-lg p-3 sm:p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Ação Tática Imediata</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                      {node.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
