/**
 * CreativeFatigueTable.tsx — Tabela Analítica de Fadiga Criativa
 *
 * Implementa a detecção de saturação e fadiga de anúncios baseada em:
 * - Frequência >= 3.5x e descolamento de CTR
 * - Badges com níveis de severidade (Fadiga Crítica, Atenção, Saudável)
 * - Filtros rápidos por status e busca textual
 * - Ações recomendadas objetivas para rotação de criativos
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  ArrowUpDown,
  RotateCw,
  Sparkles,
} from "lucide-react";
import type { CreativeAd, FatigueLevel, DiagnosticObjectiveFilter } from "@/integrations/meta/fetchAdDiagnostics";
import { cn } from "@/lib/utils";

export interface CreativeFatigueTableProps {
  creatives: CreativeAd[];
  objectiveMode?: DiagnosticObjectiveFilter;
  className?: string;
}

/**
 * Badge visual indicando o nível de fadiga do criativo
 */
function FatigueStatusBadge({ level }: { level: FatigueLevel }) {
  switch (level) {
    case "critical":
      return (
        <Badge
          variant="outline"
          className="bg-rose-950/45 text-rose-300 border-rose-800/60 font-medium text-xs flex items-center gap-1.5 py-0.5 px-2 w-fit whitespace-nowrap"
        >
          <Flame className="w-3 h-3 text-rose-400 shrink-0" />
          <span>Fadiga Crítica</span>
        </Badge>
      );
    case "warning":
      return (
        <Badge
          variant="outline"
          className="bg-amber-950/45 text-amber-300 border-amber-800/60 font-medium text-xs flex items-center gap-1.5 py-0.5 px-2 w-fit whitespace-nowrap"
        >
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Atenção</span>
        </Badge>
      );
    case "healthy":
    default:
      return (
        <Badge
          variant="outline"
          className="bg-emerald-950/45 text-emerald-300 border-emerald-800/60 font-medium text-xs flex items-center gap-1.5 py-0.5 px-2 w-fit whitespace-nowrap"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Saudável</span>
        </Badge>
      );
  }
}

export function CreativeFatigueTable({ creatives, objectiveMode, className }: CreativeFatigueTableProps) {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<FatigueLevel | "all">("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const isTraffic = objectiveMode === "traffic";
  const isWhatsapp = objectiveMode === "whatsapp";

  // Contadores por nível de severidade
  const counts = useMemo(() => {
    return {
      all: creatives.length,
      critical: creatives.filter((c) => c.fatigueLevel === "critical").length,
      warning: creatives.filter((c) => c.fatigueLevel === "warning").length,
      healthy: creatives.filter((c) => c.fatigueLevel === "healthy").length,
    };
  }, [creatives]);

  // Filtra criativos de acordo com o texto e o status selecionado
  const filteredCreatives = useMemo(() => {
    return creatives.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.campaignName.toLowerCase().includes(search.toLowerCase()) ||
        c.adsetName.toLowerCase().includes(search.toLowerCase());

      const matchesLevel = selectedLevel === "all" || c.fatigueLevel === selectedLevel;

      return matchesSearch && matchesLevel;
    });
  }, [creatives, search, selectedLevel]);

  return (
    <Card className={cn("bg-[#0f0f12] border-border text-card-foreground shadow-none", className)}>
      <CardHeader className="pb-4 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-zinc-400" />
              <CardTitle className="text-base sm:text-lg font-semibold text-zinc-100">
                {isTraffic
                  ? "Detecção & Alertas de Fadiga — Tráfego & Cliques"
                  : isWhatsapp
                  ? "Detecção & Alertas de Fadiga — Conversas WhatsApp"
                  : "Detecção & Alertas de Fadiga Criativa"}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {isTraffic
                ? "Monitoramento de repetição e perda de atratividade em tráfego: frequência excessiva (> 3.5x) e queda de CTR."
                : "Monitoramento analítico de repetição e saturação: frequência excessiva (> 3.5x) e queda de CTR/conversão."}
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className="text-[11px] font-medium border-border bg-zinc-900/60 text-zinc-300 px-2.5 py-1"
          >
            {isTraffic
              ? `${creatives.length} Criativos de Tráfego`
              : isWhatsapp
              ? `${creatives.length} Criativos de WhatsApp`
              : `${creatives.length} Criativos Mapeados`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por criativo, campanha ou conjunto..."
              className="h-9 pl-9 text-xs bg-zinc-900/80 border-border focus-visible:ring-1 focus-visible:ring-zinc-700"
            />
          </div>

          {/* Pílulas de Filtro por Severidade */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel("all")}
              className={cn(
                "h-8 px-2.5 text-xs font-medium border transition-colors",
                selectedLevel === "all"
                  ? "bg-zinc-800 text-white border-zinc-600"
                  : "bg-zinc-900/60 text-muted-foreground border-border hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              Todos ({counts.all})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel("critical")}
              className={cn(
                "h-8 px-2.5 text-xs font-medium border transition-colors flex items-center gap-1.5",
                selectedLevel === "critical"
                  ? "bg-rose-950/60 text-rose-200 border-rose-700"
                  : "bg-zinc-900/60 text-rose-400/80 border-border hover:bg-rose-950/40 hover:text-rose-200"
              )}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Crítica ({counts.critical})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel("warning")}
              className={cn(
                "h-8 px-2.5 text-xs font-medium border transition-colors flex items-center gap-1.5",
                selectedLevel === "warning"
                  ? "bg-amber-950/60 text-amber-200 border-amber-700"
                  : "bg-zinc-900/60 text-amber-400/80 border-border hover:bg-amber-950/40 hover:text-amber-200"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Atenção ({counts.warning})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel("healthy")}
              className={cn(
                "h-8 px-2.5 text-xs font-medium border transition-colors flex items-center gap-1.5",
                selectedLevel === "healthy"
                  ? "bg-emerald-950/60 text-emerald-200 border-emerald-700"
                  : "bg-zinc-900/60 text-emerald-400/80 border-border hover:bg-emerald-950/40 hover:text-emerald-200"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saudável ({counts.healthy})</span>
            </Button>
          </div>
        </div>

        {/* Tabela de Criativos */}
        <div className="border border-border/80 rounded-lg overflow-hidden bg-[#121215]">
          <Table>
            <TableHeader className="bg-zinc-900/90">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 pl-4">
                  Criativo / Campanha
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                  Frequência
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                  CTR
                </TableHead>
                {isTraffic ? (
                  <>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      Cliques
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      CPC
                    </TableHead>
                  </>
                ) : isWhatsapp ? (
                  <>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      Leads (Whats)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      CPL (Whats)
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      Cliques
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      Leads (Whats)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      CPL / CPC
                    </TableHead>
                  </>
                )}
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                  Gasto
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 pr-4">
                  Ação Recomendada
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredCreatives.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isTraffic || isWhatsapp ? 8 : 9}
                    className="text-center py-10 text-muted-foreground text-xs"
                  >
                    Nenhum criativo encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCreatives.map((ad) => {
                  const isExpanded = expandedRowId === ad.id;
                  const isHighFreq = ad.frequency >= 3.5;
                  const isLowCtr = ad.ctr < 1.0;

                  return (
                    <React.Fragment key={ad.id}>
                      <TableRow
                        onClick={() => setExpandedRowId(isExpanded ? null : ad.id)}
                        className={cn(
                          "border-border/40 hover:bg-zinc-800/40 cursor-pointer transition-colors",
                          isExpanded && "bg-zinc-800/30"
                        )}
                      >
                        {/* Nome do Criativo e Origem */}
                        <TableCell className="py-3 pl-4">
                          <div className="space-y-1 max-w-[280px]">
                            <div className="font-medium text-xs text-zinc-100 line-clamp-1">
                              {ad.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">
                              {ad.campaignName} · <span className="text-zinc-400">{ad.adsetName}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status de Fadiga */}
                        <TableCell className="py-3 text-center">
                          <FatigueStatusBadge level={ad.fatigueLevel} />
                        </TableCell>

                        {/* Frequência */}
                        <TableCell className="py-3 text-right">
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              isHighFreq ? "text-rose-400" : "text-zinc-200"
                            )}
                          >
                            {ad.frequency.toFixed(1)}x
                          </span>
                        </TableCell>

                        {/* CTR */}
                        <TableCell className="py-3 text-right">
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              isLowCtr ? "text-amber-400" : "text-zinc-200"
                            )}
                          >
                            {ad.ctr.toFixed(2)}%
                          </span>
                        </TableCell>

                        {/* Colunas específicas por objetivo */}
                        {isTraffic ? (
                          <>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              {ad.clicks.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              R$ {ad.cpc.toFixed(2)}
                            </TableCell>
                          </>
                        ) : isWhatsapp ? (
                          <>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              {ad.leads}
                            </TableCell>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              R$ {ad.cpl.toFixed(2)}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              {ad.clicks.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              {ad.leads}
                            </TableCell>
                            <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                              {ad.leads > 0 ? `R$ ${ad.cpl.toFixed(2)}` : `R$ ${ad.cpc.toFixed(2)}`}
                            </TableCell>
                          </>
                        )}

                        {/* Investimento */}
                        <TableCell className="py-3 text-right text-xs font-medium tabular-nums text-zinc-200">
                          R$ {ad.spend.toFixed(2)}
                        </TableCell>

                        {/* Ação Recomendada */}
                        <TableCell className="py-3 pr-4 max-w-[260px]">
                          <div className="text-xs text-zinc-300 font-medium line-clamp-2">
                            {ad.recommendedAction}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linha Expansível com o Detalhamento da Razão de Fadiga */}
                      {isExpanded && (
                        <TableRow className="border-border/40 bg-zinc-900/70 hover:bg-zinc-900/70">
                          <TableCell colSpan={isTraffic || isWhatsapp ? 8 : 9} className="p-4 pl-6 text-xs space-y-2">
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <span className="font-semibold text-zinc-200">
                                  Diagnóstico Heurístico:
                                </span>
                                <p className="text-zinc-300 leading-relaxed">
                                  {ad.fatigueReason}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                              <span>Alcance Estimado: {ad.reach.toLocaleString("pt-BR")} contas</span>
                              <span>Impressões: {ad.impressions.toLocaleString("pt-BR")}</span>
                              <span>Cliques: {ad.clicks.toLocaleString("pt-BR")}</span>
                              <span>CPC Médio: R$ {ad.cpc.toFixed(2)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
