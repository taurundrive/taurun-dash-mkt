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
    <Card className="p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-800 border border-border text-zinc-300">
          {badge}
        </span>
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r, idx) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="text-xs font-medium text-muted-foreground w-24 shrink-0">{r.label}</div>
              <div className="flex-1 h-7 rounded-lg bg-zinc-900 border border-border/80 overflow-hidden relative">
                <div
                  className={cn(
                    "h-full rounded-lg flex items-center px-3 text-xs font-medium text-white transition-all duration-500 ease-out",
                    idx === 0 ? "bg-zinc-700/70 border-r border-zinc-600" : "bg-zinc-600/70 border-r border-zinc-500 text-white",
                  )}
                  style={{ width: `${r.width}%` }}
                >
                  {formatNumber(r.value)}
                </div>
              </div>
              <div className="text-xs text-zinc-300 w-12 text-right shrink-0 tabular-nums font-medium">
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