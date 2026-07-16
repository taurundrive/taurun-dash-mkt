import { useEffect, useMemo, useState } from "react";
import {
  Users, Eye, Heart, MessageCircle, Send, Bookmark,
  Image as ImageIcon, MousePointerClick, Radio, UserCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/format";
import { usePeriodFilter, PresetDays } from "@/context/PeriodFilterContext";
import { cn } from "@/lib/utils";
import { syncInstagramInsights } from "@/integrations/meta/fetchInstagramInsights";

interface InstaRow {
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  profile_views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  website_clicks: number;
  posts_published: number;
}

function MetricasContent() {
  const [rows, setRows] = useState<InstaRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { range, label, filter, setPreset } = usePeriodFilter();

  useEffect(() => {
    let active = true;
    const fetchRows = async () => {
      const { data, error } = await supabase
        .from("instagram_metrics_daily")
        .select("date, followers, reach, impressions, profile_views, likes, comments, shares, saves, website_clicks, posts_published")
        .order("date", { ascending: true })
        .limit(1000);
      if (!active) return;
      if (error) {
        console.error("[metricas] fetch error:", error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as InstaRow[]);
      }
      setLoading(false);

      // Tenta sincronizar direto com a Graph API (se o token tiver permissão de Instagram)
      syncInstagramInsights(range.start, range.end).then((graphRows) => {
        if (active && graphRows && graphRows.length > 0) {
          setRows(graphRows);
        }
      });
    };
    fetchRows();

    const channel = supabase
      .channel("instagram_metrics_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instagram_metrics_daily" },
        () => fetchRows(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [range.start, range.end]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (rows.length === 0) return [];
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.filter((r) => r.date >= range.start && r.date <= range.end);
  }, [rows, range.start, range.end]);

  const agg = useMemo(() => {
    const sum = (k: keyof InstaRow) => filtered.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const last = filtered[filtered.length - 1];
    const first = filtered[0];
    return {
      followers: last?.followers ?? 0,
      followersDelta: last && first ? last.followers - first.followers : 0,
      reach: sum("reach"),
      impressions: sum("impressions"),
      profile_views: sum("profile_views"),
      likes: sum("likes"),
      comments: sum("comments"),
      shares: sum("shares"),
      saves: sum("saves"),
      website_clicks: sum("website_clicks"),
      posts_published: sum("posts_published"),
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto w-full py-20 text-center text-sm text-muted-foreground">
        Carregando métricas...
      </div>
    );
  }

  const empty = !rows || rows.length === 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider">Métricas do Instagram</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Engajamento, alcance e crescimento do perfil — {label}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0a0a0d] border border-white/[0.06] rounded-2xl p-1.5 shadow-sm">
          {([7, 15, 30] as PresetDays[]).map((d) => (
            <Button
              key={d}
              variant="ghost"
              size="sm"
              onClick={() => setPreset(d)}
              className={cn(
                "h-8 px-3.5 text-xs font-mono rounded-xl uppercase tracking-wider transition-all duration-150 ease-out active:scale-95",
                filter.mode === "preset" && filter.preset === d
                  ? "bg-white/[0.08] text-white font-bold border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03]",
              )}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {empty ? (
        <Card className="p-12 text-center bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <p className="text-xs font-mono text-zinc-500">
            Nenhum dado de Instagram ainda. Configure a automação no n8n para alimentar este painel.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <p className="text-xs font-mono text-zinc-500">
            Sem dados do Instagram no período selecionado ({label}).
          </p>
        </Card>
      ) : (
        <>
          {/* Linha 1: highlights principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Seguidores"
              value={formatNumber(agg.followers)}
              icon={Users}
              size="lg"
              index={0}
              hint={agg.followersDelta !== 0
                ? `${agg.followersDelta > 0 ? "+" : ""}${formatNumber(agg.followersDelta)} no período`
                : "sem variação"}
              hintTone={agg.followersDelta > 0 ? "up" : agg.followersDelta < 0 ? "down" : "neutral"}
            />
            <KpiCard label="Alcance" value={formatNumber(agg.reach)} icon={Radio} size="lg" index={1} />
            <KpiCard label="Impressões" value={formatNumber(agg.impressions)} icon={Eye} size="lg" index={2} />
            <KpiCard label="Visualizações do perfil" value={formatNumber(agg.profile_views)} icon={UserCheck} size="lg" index={3} />
          </div>

          {/* Linha 2: engajamento */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 px-1">Engajamento</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Curtidas" value={formatNumber(agg.likes)} icon={Heart} index={4} />
              <KpiCard label="Comentários" value={formatNumber(agg.comments)} icon={MessageCircle} index={5} />
              <KpiCard label="Compartilhamentos" value={formatNumber(agg.shares)} icon={Send} index={6} />
              <KpiCard label="Salvamentos" value={formatNumber(agg.saves)} icon={Bookmark} index={7} />
            </div>
          </div>

          {/* Linha 3: ações & conteúdo */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 px-1">Ações & Conteúdo</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Cliques no site" value={formatNumber(agg.website_clicks)} icon={MousePointerClick} index={8} />
              <KpiCard label="Posts publicados" value={formatNumber(agg.posts_published)} icon={ImageIcon} index={9} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Metricas() {
  return (
    <DashboardLayout title="Métricas">
      <MetricasContent />
    </DashboardLayout>
  );
}