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
  if (conv === null) return "#3f3f46"; // zinc-700
  if (conv >= 25) return "#ffffff";   // white (alta performance)
  if (conv >= 15) return "#a1a1aa";   // zinc-400 (média)
  return "#52525b";                   // zinc-600 (baixa)
}

function toneForCpl(cpl: number, min: number, max: number) {
  if (max === min) return "#ffffff";
  const pct = (cpl - min) / (max - min);
  if (pct < 0.34) return "#ffffff";   // melhor CPL em branco
  if (pct < 0.67) return "#a1a1aa";   // médio em zinc-400
  return "#52525b";                   // maior CPL em zinc-600
}

function shortName(name: string) {
  // Pega as duas primeiras palavras significativas
  const cleaned = name.replace(/\s+-\s+/g, " ").trim();
  return cleaned.length > 12 ? cleaned.slice(0, 11) + "…" : cleaned;
}

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 12,
  color: "#f4f4f5",
  padding: "8px 12px",
};

export function ConversionChart({ campaigns }: { campaigns: CampaignAggregate[] }) {
  const data = campaigns
    .filter((c) => c.conversion !== null)
    .sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0))
    .slice(0, 6)
    .map((c) => ({ name: shortName(c.name), value: c.conversion ?? 0, full: c.name }));

  return (
    <Card className="p-6 bg-card border border-border rounded-xl shadow-sm flex-1">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-base font-semibold text-zinc-100">Taxa de conversão por campanha</h3>
      </div>
      <div className="flex gap-4 mb-3 flex-wrap">
        <Legend color="#ffffff" label="≥25% — alta conversão" />
        <Legend color="#a1a1aa" label="15–25% — média" />
        <Legend color="#52525b" label="<15% — baixa" />
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 24 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
    <Card className="p-6 bg-card border border-border rounded-xl shadow-sm flex-1">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-base font-semibold text-zinc-100">CPL comparativo (R$)</h3>
      </div>
      <div className="flex gap-4 mb-3 flex-wrap">
        <Legend color="#ffffff" label="Menor CPL (melhor)" />
        <Legend color="#a1a1aa" label="Médio" />
        <Legend color="#52525b" label="Maior CPL" />
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 24 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </div>
  );
}