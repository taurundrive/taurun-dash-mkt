import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { CampaignAggregate } from "@/lib/aggregations";
import { formatCurrency, formatPercent } from "@/lib/format";

function toneFor(conv: number | null) {
  if (conv === null) return "hsl(var(--muted-foreground))";
  if (conv >= 25) return "hsl(var(--success))";
  if (conv >= 15) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function toneForCpl(cpl: number, min: number, max: number) {
  if (max === min) return "hsl(var(--success))";
  const pct = (cpl - min) / (max - min);
  if (pct < 0.34) return "hsl(var(--success))";
  if (pct < 0.67) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function shortName(name: string) {
  // Pega as duas primeiras palavras significativas
  const cleaned = name.replace(/\s+-\s+/g, " ").trim();
  return cleaned.length > 12 ? cleaned.slice(0, 11) + "…" : cleaned;
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  fontSize: 11,
  padding: "6px 8px",
};

export function ConversionChart({ campaigns }: { campaigns: CampaignAggregate[] }) {
  const data = campaigns
    .filter((c) => c.conversion !== null)
    .sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0))
    .slice(0, 6)
    .map((c) => ({ name: shortName(c.name), value: c.conversion ?? 0, full: c.name }));

  return (
    <Card className="p-5 bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl hover:border-white/[0.15] transition-all duration-200 ease-out group flex-1">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-500 group-hover:text-zinc-400 transition-colors">Taxa de conversão por campanha</span>
      </div>
      <div className="flex gap-4 mb-3 flex-wrap">
        <Legend color="hsl(var(--success))" label="≥25% — escalar" />
        <Legend color="hsl(var(--warning))" label="15–25% — otimizar" />
        <Legend color="hsl(var(--destructive))" label="<15% — revisar" />
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 24 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(v: number) => [formatPercent(v), "Conversão"]}
              labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={toneFor(d.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CplChart({ campaigns }: { campaigns: CampaignAggregate[] }) {
  const data = campaigns
    .filter((c) => c.conversion !== null && c.cpl > 0)
    .sort((a, b) => a.cpl - b.cpl)
    .slice(0, 6)
    .map((c) => ({ name: shortName(c.name), value: c.cpl, full: c.name }));

  const min = Math.min(...data.map((d) => d.value), 0);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="p-5 bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl hover:border-white/[0.15] transition-all duration-200 ease-out group">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-500 group-hover:text-zinc-400 transition-colors">CPL comparativo (R$)</span>
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 24 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(v: number) => [formatCurrency(v), "CPL"]}
              labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={toneForCpl(d.value, min, max)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
      <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </div>
  );
}