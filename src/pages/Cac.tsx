import { useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PeriodFilters } from "@/components/dashboard/PeriodFilters";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import { IndicatorCardSkeleton } from "@/components/dashboard/CardSkeleton";
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
        <p className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
          6 indicadores chave de aquisição via tráfego pago — {label}
        </p>
      </div>

      {/* Resumo do mês — glass material Apple com reflexo de superfície */}
      <div className="relative overflow-hidden rounded-2xl
                      bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl
                      border border-white/[0.06]
                      shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]
                      p-6 space-y-5">
        {/* Reflexo de superfície no topo — camada de material translúcido */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none" />

        <div className="border-b border-white/[0.06] pb-3.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500">
            Base do mês selecionado
          </p>
          {/* Badge de período: âncora espacial fixa — não muda de tamanho ao trocar mês */}
          <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider font-semibold
                           bg-white/[0.04] px-3 py-1 rounded-lg border border-white/[0.06]
                           transition-[border-color] duration-[120ms] hover:border-white/[0.12]">
            {currentRow ? currentRow.label : "Sem dados"}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-1">
          <StatBlock label="Investido" value={currentRow ? formatCurrency(currentRow.invested) : "—"} />
          <StatBlock label="Leads pagos" value={currentRow ? formatNumber(currentRow.paidLeads) : "—"} />
          <StatBlock label="Vendas pagas" value={currentRow ? formatNumber(currentRow.closedSales) : "—"} />
          <StatBlock label="Receita pago" value={currentRow?.paidRevenue ? formatCurrency(currentRow.paidRevenue) : "—"} />
          <StatBlock label="Leads → fechadas" value={currentRow?.leadsClosedSales ? `${formatNumber(currentRow.leadsClosedSales)} vendas` : "—"} />
        </div>
      </div>

      {/* Grid 5 indicadores com stagger — index passa a posição para o delay */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardOrder.map((key, i) => (
          <IndicatorCard key={key} indicator={indicators[key]} index={i} />
        ))}
      </div>

      {/* Tabela histórica — glass container com rows de resposta 80ms */}
      <div className="relative overflow-hidden rounded-2xl
                      bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl
                      border border-white/[0.06]
                      shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
        {/* Reflexo de superfície */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none" />

        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500">Histórico mensal</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                <Th className="text-left">Mês</Th>
                <Th>Investido</Th>
                <Th>Leads</Th>
                <Th>Vendas</Th>
                <Th>Receita pago</Th>
                <Th>ROAS</Th>
                <Th>CAC</Th>
                <Th>Conv.</Th>
                <Th>CPL</Th>
                <Th>Leads→Fechadas</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ind = computePaidIndicators(r);
                const isCurrent = r.monthIso.slice(0, 7) === selectedMonthIso;
                return (
                  <tr
                    key={r.monthIso}
                    className={cn(
                      // Hover: 80ms — resposta imediata, não lenta
                      "border-b border-white/[0.04] last:border-0 cursor-pointer",
                      "transition-[background-color] duration-[80ms]",
                      "hover:bg-white/[0.04]",
                      // Linha ativa: indicador lateral como âncora espacial (box-shadow esquerdo)
                      isCurrent
                        ? "bg-white/[0.05] font-semibold shadow-[-2px_0_0_0_rgba(96,165,250,0.5)]"
                        : "",
                    )}
                  >
                    {/* Mês: font-medium, tracking tight — SF Pro Display */}
                    <td className="px-5 py-4 font-sans font-medium text-zinc-100 tracking-[-0.01em]">{r.label}</td>
                    <Td>{r.invested > 0 ? formatCurrency(r.invested) : "—"}</Td>
                    <Td>{r.paidLeads > 0 ? formatNumber(r.paidLeads) : "—"}</Td>
                    <Td>{r.closedSales > 0 ? formatNumber(r.closedSales) : "—"}</Td>
                    <Td>{r.paidRevenue ? formatCurrency(r.paidRevenue) : "—"}</Td>
                    <Td>{ind.roas.display}</Td>
                    <Td>{ind.cac.display}</Td>
                    <Td>{ind.conversion.display}</Td>
                    <Td>{ind.cpl.display}</Td>
                    <Td>{r.leadsClosedSales > 0 ? formatNumber(r.leadsClosedSales) : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * StatBlock — Bloco de dado com tipografia óptica Apple.
 * Tracking [-0.03em] no valor: SF Pro Display usa espaçamento negativo em tamanhos grandes
 */
function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 lg:border-l lg:border-white/[0.06] lg:pl-5 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="font-sans text-xl font-bold tabular-nums tracking-[-0.03em] leading-none text-white">{value}</p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "font-medium px-5 py-3.5 text-[11px] font-mono uppercase tracking-wider text-zinc-500 text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-5 py-4 text-right tabular-nums font-mono text-xs font-medium text-zinc-300">
      {children}
    </td>
  );
}

export default function Cac() {
  return (
    <DashboardLayout title="CAC">
      <CacContent />
    </DashboardLayout>
  );
}