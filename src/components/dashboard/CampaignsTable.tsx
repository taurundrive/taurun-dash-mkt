import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignAggregate } from "@/lib/aggregations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "all" | "conversas" | "alcance";

function shortType(type: string): string {
  if (type.startsWith("Conversas")) return "Mensagens";
  if (type.toLowerCase().includes("alcance")) return "Alcance";
  if (type.toLowerCase().includes("destaque")) return "Dest. página";
  return type;
}

function convTone(conv: number | null) {
  if (conv === null) return null;
  if (conv >= 25) return "good";
  if (conv >= 15) return "mid";
  return "low";
}

function spendTone(spend: number, max: number) {
  if (max <= 0) return "good";
  const pct = spend / max;
  if (pct < 0.45) return "good";
  if (pct < 0.75) return "mid";
  return "low";
}

export function CampaignsTable({ rows }: { rows: CampaignAggregate[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "conversas") return rows.filter((r) => r.conversion !== null);
    return rows.filter((r) => r.conversion === null);
  }, [rows, tab]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.leads - a.leads),
    [filtered],
  );
  const maxSpend = useMemo(
    () => Math.max(...sorted.map((r) => r.invested), 1),
    [sorted],
  );

  return (
    <Card className="p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            Campanhas — tráfego pago
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium border border-border"
          >
            Período atual
          </Badge>
        </div>
      </div>

      {/* Abas de Filtro Shadcn/ui */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-5 w-fit">
        <TabsList className="h-9 p-1 bg-zinc-900 border border-border rounded-lg flex items-center gap-1">
          {(
            [
              ["all", "Todas"],
              ["conversas", "Conversas"],
              ["alcance", "Alcance"],
            ] as const
          ).map(([k, label]) => (
            <TabsTrigger
              key={k}
              value={k}
              className="h-7 px-3 text-xs font-medium rounded-md transition-colors data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-zinc-200"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tabela Shadcn/ui */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/50 [&_tr]:border-b-border">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-left text-xs font-medium text-muted-foreground h-9 px-4">
                Campanha
              </TableHead>
              {tab === "conversas" && (
                <TableHead className="text-right text-xs font-medium text-muted-foreground h-9 px-4">
                  Cliques
                </TableHead>
              )}
              <TableHead className="text-right text-xs font-medium text-muted-foreground h-9 px-4">
                Leads
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground h-9 px-4 min-w-[140px]">
                Valor gasto
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground h-9 px-4">
                Conv.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-0">
            {sorted.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={tab === "conversas" ? 5 : 4}
                  className="text-center text-sm text-muted-foreground py-10"
                >
                  Sem dados para o período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((c) => {
                const ct = convTone(c.conversion);
                const fillPct = Math.min(95, (c.invested / maxSpend) * 100);
                return (
                  <TableRow
                    key={c.id}
                    className="border-b border-border/60 hover:bg-zinc-800/30 transition-colors group/row cursor-pointer"
                  >
                    <TableCell className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1 h-5 rounded-full shrink-0 bg-zinc-700 group-hover/row:bg-zinc-400 transition-colors" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-100 truncate max-w-[240px] group-hover/row:text-white transition-colors">
                            {c.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant="outline"
                              className="text-xs font-normal px-2 py-0.5 rounded bg-zinc-800/60 border-border text-muted-foreground"
                            >
                              {shortType(c.type)}
                            </Badge>
                            {!c.computesRoas && (
                              <Badge
                                variant="outline"
                                className="text-xs font-normal px-2 py-0.5 rounded bg-zinc-800/40 text-muted-foreground border-border"
                                title="Não entra no cálculo de ROAS/CAC"
                              >
                                Fora ROAS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {tab === "conversas" && (
                      <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground tabular-nums align-middle">
                        {formatNumber(c.clicks)}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-right text-sm text-zinc-100 tabular-nums align-middle font-semibold">
                      {formatNumber(c.leads)}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2.5 justify-end">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden min-w-[40px] max-w-[80px]">
                          <div
                            className="h-full rounded-full bg-zinc-400 group-hover/row:bg-white transition-all duration-300"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <span className="text-sm text-zinc-100 tabular-nums font-medium">
                          {formatCurrency(c.invested)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right align-middle">
                      {ct === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-200 border-border"
                        >
                          {formatPercent(c.conversion ?? 0)}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}