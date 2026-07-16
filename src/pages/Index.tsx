import { useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CardSkeleton } from "@/components/dashboard/CardSkeleton";
import { CampaignsTable } from "@/components/dashboard/CampaignsTable";
import { FunnelEstimate } from "@/components/dashboard/FunnelEstimate";
import { ConversionChart, CplChart } from "@/components/dashboard/ComparisonCharts";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import { useDashboardData } from "@/data/dataSource";
import { aggregateCampaigns, performanceTotals } from "@/lib/aggregations";
import { formatCurrency, formatNumber } from "@/lib/format";

function PerformanceContent() {
  const { range } = usePeriodFilter();
  const { data, loading } = useDashboardData(range);
  const totals = useMemo(
    () => (data ? performanceTotals(data, range) : null),
    [data, range],
  );
  const campaigns = useMemo(
    () => (data ? aggregateCampaigns(data, range) : []),
    [data, range],
  );

  if (loading || !totals) {
    return (
      <div className="flex flex-col gap-5 max-w-[1500px] mx-auto w-full">
        {/* Skeleton grid — mesma estrutura do grid real para evitar layout shift */}
        <section>
          <div className="w-36 h-2.5 rounded-full bg-white/[0.06] mb-3.5 ml-1" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1.8fr_1fr] gap-2.5">
            <CardSkeleton size="lg" />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton size="lg" />
            <CardSkeleton />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1500px] mx-auto w-full">
      {/* KPIs */}
      <section>
        <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 mb-3.5 px-1">
          Performance geral
        </p>
        {/* KPIs — index prop para stagger escalonado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1.8fr_1fr] gap-2.5">
          <KpiCard
            index={0}
            label="Vendas"
            value={formatCurrency(totals.totalSales, { compact: true })}
            size="lg"
            hint="período atual"
          />
          <KpiCard
            index={1}
            label="Campanhas"
            value={formatNumber(totals.campaignsCount)}
            hint="ativas"
          />
          <KpiCard
            index={2}
            label="Leads do WhatsApp"
            value={formatNumber(totals.totalLeadsConversation)}
            hint="recebidos via Z-API"
          />
          <KpiCard
            index={3}
            label="Investimento total"
            value={formatCurrency(totals.totalInvested, { compact: true })}
            size="lg"
            hint={`${formatCurrency(totals.totalInvestedComputed, { compact: true })} conversas · ${formatCurrency(totals.totalInvestedBranding, { compact: true })} tráfego`}
          />
          <KpiCard
            index={4}
            label="Custo/lead"
            value={formatCurrency(totals.cpl)}
            hint="médio"
          />
        </div>
      </section>

      {/* Funil */}
      <FunnelEstimate campaigns={campaigns} />

      {/* Tabela + Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        <CampaignsTable rows={campaigns} />
        <div className="flex flex-col gap-3.5">
          <ConversionChart campaigns={campaigns} />
          <CplChart campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <DashboardLayout title="Dashboard de Marketing">
      <PerformanceContent />
    </DashboardLayout>
  );
}
