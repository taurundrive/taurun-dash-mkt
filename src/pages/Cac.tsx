import { useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PeriodFilters } from "@/components/dashboard/PeriodFilters";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import { IndicatorCardSkeleton } from "@/components/dashboard/CardSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardData } from "@/data/dataSource";
import { computePaidIndicators, PaidIndicatorsSet } from "@/lib/aggregations";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function CacContent() {
  const { range, filter, label } = usePeriodFilter();
  const { data, loading } = useDashboardData(range);

  const rows = data?.cacMonthly ?? [];

  // The CAC view is intrinsically monthly. Pick the month indicated by the
  // global filter when in "month" mode; otherwise default to the latest month
  // with data (so preset/custom ranges still show something useful).
  const selectedMonthIso = useMemo(() => {
    if (filter.mode === "month") return filter.month.slice(0, 7);
    const withData = rows.filter((r) => r.invested > 0 || r.closedSales > 0 || r.paidRevenue);
    const last = withData[withData.length - 1] ?? rows[rows.length - 1];
    return last ? last.monthIso.slice(0, 7) : null;
  }, [filter, rows]);

  const currentRow = useMemo(
    () => rows.find((r) => r.monthIso.slice(0, 7) === selectedMonthIso) ?? null,
    [rows, selectedMonthIso],
  );

  const indicators: PaidIndicatorsSet = useMemo(
    () => computePaidIndicators(currentRow),
    [currentRow],
  );

  if (loading || !data) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Skeleton da row de base */}
        <div className="relative overflow-hidden rounded-2xl bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl border border-white/[0.06] p-6">
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
          <div className="w-40 h-2.5 rounded-full bg-white/[0.06] mb-5" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="w-20 h-2 rounded-full bg-white/[0.05]" />
                <div className="w-24 h-6 rounded-lg bg-white/[0.07]" />
              </div>
            ))}
          </div>
        </div>
        {/* Skeleton dos 5 indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <IndicatorCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const cardOrder: Array<keyof PaidIndicatorsSet> = [
    "roas",
    "costRevenue",
    "cac",
    "conversion",
    "cpl",
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Indicadores chave de aquisição via tráfego pago — {label}
        </h2>
      </div>

      {/* Resumo do mês — Card sólido Shadcn */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Base do mês selecionado
          </h3>
          <span className="text-xs text-zinc-300 font-medium bg-zinc-800/80 px-2.5 py-1 rounded-md border border-border">
            {currentRow ? currentRow.label : "Sem dados"}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-1">
          <StatBlock label="Investido" value={currentRow ? formatCurrency(currentRow.invested) : "—"} />
          <StatBlock label="Leads pagos" value={currentRow ? formatNumber(currentRow.paidLeads) : "—"} />
          <StatBlock label="Vendas totais" value={currentRow ? formatNumber(currentRow.closedSales) : "—"} />
          <StatBlock label="Receita pago" value={currentRow?.paidRevenue ? formatCurrency(currentRow.paidRevenue) : "—"} />
          <StatBlock label="Vendas pagas" value={currentRow?.leadsClosedSales ? `${formatNumber(currentRow.leadsClosedSales)} vendas` : "—"} />
        </div>
      </div>

      {/* Grid 5 indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardOrder.map((key, i) => (
          <IndicatorCard key={key} indicator={indicators[key]} index={i} />
        ))}
      </div>

      {/* Tabela histórica — Card sólido Shadcn */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-zinc-100">Histórico mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="bg-zinc-900/50 [&_tr]:border-b-border">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-left font-medium px-4 py-3 text-xs text-muted-foreground h-auto">
                  Mês
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  Investido
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  Leads
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  Vendas Totais
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  Receita pago
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  ROAS
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  CAC
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  Conv.
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  CPL
                </TableHead>
                <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground text-right h-auto">
                  Vendas Pagas
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {rows.map((r) => {
                const ind = computePaidIndicators(r);
                const isCurrent = r.monthIso.slice(0, 7) === selectedMonthIso;
                return (
                  <TableRow
                    key={r.monthIso}
                    className={cn(
                      "border-b border-border/60 hover:bg-zinc-800/30 transition-colors cursor-pointer",
                      isCurrent && "bg-zinc-800/40 font-medium",
                    )}
                  >
                    <TableCell className="px-4 py-3 text-zinc-100 font-medium">
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <span>{r.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatCurrency(r.invested)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatNumber(r.paidLeads)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatNumber(r.closedSales)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {r.paidRevenue ? formatCurrency(r.paidRevenue) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums font-medium text-zinc-100">
                      {ind.roas.display}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums font-medium text-zinc-100">
                      {ind.cac.display}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums font-medium text-zinc-100">
                      {ind.conversion.display}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums font-medium text-zinc-100">
                      {ind.cpl.display}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {r.leadsClosedSales ? `${formatNumber(r.leadsClosedSales)}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 lg:border-l lg:border-border lg:pl-5 first:border-l-0 first:pl-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums tracking-tight leading-none text-white">{value}</p>
    </div>
  );
}

export default function Cac() {
  return (
    <DashboardLayout title="CAC">
      <CacContent />
    </DashboardLayout>
  );
}