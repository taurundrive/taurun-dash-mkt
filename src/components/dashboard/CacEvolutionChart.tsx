import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Dot,
} from "recharts";
import { Card } from "@/components/ui/card";
import { CacRowComputed, rateCac } from "@/lib/aggregations";
import { formatCurrency } from "@/lib/format";

interface Props {
  rows: CacRowComputed[];
  targetCac: number;
}

export function CacEvolutionChart({ rows, targetCac }: Props) {
  const data = rows
    .filter((r) => r.cac !== null)
    .map((r) => ({
      label: r.label,
      cac: r.cac as number,
      invested: r.invested,
      leads: r.paidLeads,
      sales: r.closedSales,
    }));

  return (
    <Card className="p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Evolução do CAC</p>
        <p className="text-sm text-muted-foreground mt-1">
          Linha tracejada = meta de {formatCurrency(targetCac)}
        </p>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                if (name === "cac") return [formatCurrency(value), "CAC"];
                return [value, name];
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <ReferenceLine
              y={targetCac}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{ value: "Meta", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="cac"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const score = rateCac(payload.cac, targetCac);
                return <Dot key={`dot-${payload.label}`} cx={cx} cy={cy} r={5} fill={score.color} stroke="hsl(var(--background))" strokeWidth={2} />;
              }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}