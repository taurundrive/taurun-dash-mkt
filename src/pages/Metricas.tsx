import { useEffect, useState } from "react";
import {
  Users,
  Eye,
  Radio,
  Heart,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/format";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import {
  fetchInstagramPosts,
  InstagramFetchResult,
} from "@/integrations/meta/fetchInstagramPosts";
import { InstagramTopPosts } from "@/components/dashboard/InstagramTopPosts";
import { InstagramPostsTable } from "@/components/dashboard/InstagramPostsTable";

function MetricasContent() {
  const { label, filter, range } = usePeriodFilter();
  const [data, setData] = useState<InstagramFetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mês selecionado no filtro (ex: "2026-09")
  const targetMonth =
    filter.mode === "month" ? filter.month : range.start.slice(0, 7);

  const loadData = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchInstagramPosts(targetMonth, force);
      setData(res);
    } catch (err) {
      console.error("[Metricas] Erro ao carregar posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData().then(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, [targetMonth]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Cabeçalho da Seção com Ação de Atualizar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-300" />
            <h2 className="text-sm font-medium text-muted-foreground">
              Performance de Conteúdo & Publicações — {label}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Métricas orgânicas oficiais da conta @tauruncompany via Meta Graph API
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={loading || refreshing}
          onClick={() => loadData(true)}
          className="h-8 px-3 text-xs font-medium rounded-lg border-border hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-muted-foreground ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          <span>{refreshing ? "Atualizando..." : "Sincronizar agora"}</span>
        </Button>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card
                key={i}
                className="h-28 bg-card border border-border/60 rounded-xl p-5"
              />
            ))}
          </div>
          <div className="h-64 bg-card border border-border/60 rounded-xl" />
          <div className="h-80 bg-card border border-border/60 rounded-xl" />
        </div>
      ) : !data || data.posts.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center bg-card border border-border rounded-xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-850 border border-border mx-auto flex items-center justify-center text-zinc-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Nenhuma publicação encontrada em {label}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Não localizamos posts publicados pela @tauruncompany no mês selecionado.
            Utilize o seletor de período no topo da tela para visualizar outros meses.
          </p>
        </Card>
      ) : (
        /* Dados Carregados */
        <>
          {/* Linha de KPIs Consolidados do Período */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <KpiCard
              label="Seguidores"
              value={formatNumber(data.summary.followersCount)}
              icon={Users}
              size="lg"
              index={0}
              hint="Perfil @tauruncompany"
            />
            <KpiCard
              label="Visualizações de Vídeo"
              value={formatNumber(data.summary.totalViews)}
              icon={Eye}
              size="lg"
              index={1}
              hint="Reproduções de Reels no mês"
            />
            <KpiCard
              label="Alcance Único"
              value={formatNumber(data.summary.totalReach)}
              icon={Radio}
              size="lg"
              index={2}
              hint="Contas alcançadas no período"
            />
            <KpiCard
              label="Interações Totais"
              value={formatNumber(
                data.summary.totalLikes +
                  data.summary.totalComments +
                  data.summary.totalShares,
              )}
              icon={Heart}
              size="lg"
              index={3}
              hint={`${formatNumber(data.summary.totalLikes)} likes · ${formatNumber(
                data.summary.totalComments,
              )} coments`}
            />
            <KpiCard
              label="Posts no Mês"
              value={formatNumber(data.summary.totalPosts)}
              icon={ImageIcon}
              size="lg"
              index={4}
              hint={
                data.summary.totalCollabs > 0
                  ? `${data.summary.totalCollabs} em collab · ${formatPercent(data.summary.avgEngagementRate)} eng.`
                  : `Taxa média: ${formatPercent(data.summary.avgEngagementRate)}`
              }
            />
          </div>

          {/* Top 3 Publicações em Destaque */}
          <InstagramTopPosts posts={data.posts} />

          {/* Tabela Analítica Completa com Ordenação */}
          <InstagramPostsTable posts={data.posts} />
        </>
      )}
    </div>
  );
}

export default function Metricas() {
  return (
    <DashboardLayout title="Métricas do Instagram">
      <MetricasContent />
    </DashboardLayout>
  );
}