import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  revenue: number;
  invested: number;
  target?: number;
}

export function RoasBox({ revenue, invested, target = 40 }: Props) {
  const roas = invested > 0 ? revenue / invested : 0;
  const diffPct = target > 0 ? ((roas - target) / target) * 100 : 0;
  const above = roas >= target;
  const perReal = formatCurrency(roas, { compact: false });

  return (
    <Card className="p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-6">
        {/* Bloco do número */}
        <div className="shrink-0">
          <p className="text-sm font-medium text-muted-foreground mb-1.5">ROAS geral</p>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-white leading-none">{roas.toFixed(1)}x</p>
        </div>

        {/* Divisor sutil */}
        <div className="h-12 w-px bg-border shrink-0 hidden sm:block" />

        {/* Explicação */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            O que isso significa:
          </p>
          <p className="text-sm leading-snug text-zinc-300">
            Cada <span className="font-semibold text-white">R$ 1,00</span> investido em anúncios gerou{" "}
            <span className="font-bold text-white">{perReal}</span> em receita.
          </p>
        </div>

        {/* Badge meta */}
        <div className="shrink-0">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium bg-zinc-800 border border-border text-zinc-200"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                above ? "bg-emerald-400" : "bg-amber-400"
              )}
            />
            <span>
              {above ? "+" : ""}
              {diffPct.toFixed(0)}% {above ? "acima" : "abaixo"} da meta ({target}x)
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 pt-3.5 border-t border-border">
        {formatCurrency(revenue, { compact: true })} receita ÷{" "}
        {formatCurrency(invested, { compact: true })} investido
      </p>
    </Card>
  );
}