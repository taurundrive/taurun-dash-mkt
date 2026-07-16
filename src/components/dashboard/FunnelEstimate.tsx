import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { CampaignAggregate } from "@/lib/aggregations";
import { cn } from "@/lib/utils";

interface Props {
  campaigns: CampaignAggregate[];
}

type Tone = "primary" | "success" | "warning" | "destructive";

interface Row {
  label: string;
  value: number;
  width: number;
  pct: number;
  tone: Tone;
}

function FunnelCard({
  title,
  badge,
  rows,
  empty,
}: {
  title: string;
  badge: string;
  badgeTone: "primary" | "muted";
  rows: Row[];
  empty?: string;
}) {
  return (
    <Card className="p-6 bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl hover:border-white/[0.15] transition-all duration-200 ease-out group">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">{title}</span>
        <span className="text-[10px] px-2.5 py-1 rounded-lg font-mono font-medium uppercase tracking-[0.08em] bg-white/[0.03] border border-white/[0.06] text-zinc-300">
          {badge}
        </span>
      </div>
      {empty ? (
        <p className="text-xs font-mono text-zinc-500 py-6 text-center">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r, idx) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="text-[11px] font-mono font-medium text-zinc-400 w-24 shrink-0">{r.label}</div>
              <div className="flex-1 h-7 rounded-xl bg-white/[0.03] border border-white/[0.04] overflow-hidden relative">
                <div
                  className={cn(
                    "h-full rounded-xl flex items-center px-3 text-[11px] font-mono font-semibold text-white transition-all duration-500 ease-out",
                    idx === 0 ? "bg-white/[0.12] border-r border-white/20" : "bg-white/[0.22] border-r border-white/30 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
                  )}
                  style={{ width: `${r.width}%` }}
                >
                  {formatNumber(r.value)}
                </div>
              </div>
              <div className="text-[11px] text-zinc-300 w-12 text-right shrink-0 font-mono font-semibold">
                {r.pct.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function FunnelEstimate({ campaigns }: Props) {
  // Conversas (entram no ROAS)
  const conv = campaigns.filter((c) => c.conversion !== null);
  const convClicks = conv.reduce((s, c) => s + c.clicks, 0);
  const convLeads = conv.reduce((s, c) => s + c.leads, 0);
  const overallConv = convClicks > 0 ? (convLeads / convClicks) * 100 : 0;

  const convRows: Row[] = [
    { label: "Cliques", value: convClicks, width: 100, pct: 100, tone: "primary" },
    { label: "Leads", value: convLeads, width: Math.max(8, Math.min(95, overallConv * 5)), pct: overallConv, tone: "success" },
  ];

  // Tráfego / branding (fora do ROAS)
  const traf = campaigns.filter((c) => c.conversion === null);
  const trafClicks = traf.reduce((s, c) => s + c.clicks, 0);

  const trafRows: Row[] = [
    { label: "Cliques", value: trafClicks, width: 100, pct: 100, tone: "primary" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
      <FunnelCard
        title="Funil de conversão — Leads"
        badge="Conversas"
        badgeTone="primary"
        rows={convRows}
        empty={conv.length === 0 ? "Sem campanhas de conversa no período" : undefined}
      />
      <FunnelCard
        title="Funil de conversão — Tráfego"
        badge="Branding / Tráfego"
        badgeTone="muted"
        rows={trafRows}
        empty={traf.length === 0 ? "Sem campanhas de tráfego no período" : undefined}
      />
    </div>
  );
}