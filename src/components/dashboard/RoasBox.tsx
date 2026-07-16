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
    <Card className="p-6 bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl hover:border-white/[0.15] transition-all duration-200 ease-out group">
      <div className="flex flex-wrap items-center justify-between gap-6">
        {/* Bloco do número */}
        <div className="shrink-0">
          <p className="text-[11px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1.5">ROAS geral</p>
          <p className="font-sans text-4xl font-extrabold tracking-[-0.03em] tabular-nums text-white leading-none">{roas.toFixed(1)}x</p>
        </div>

        {/* Divisor sutil */}
        <div className="h-12 w-px bg-white/[0.06] shrink-0 hidden sm:block" />

        {/* Explicação */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.08em] mb-1">
            O que isso significa:
          </p>
          <p className="text-sm leading-snug text-zinc-300 font-sans">
            Cada <span className="font-bold text-white">R$ 1,00</span> investido em anúncios gerou{" "}
            <span className="font-extrabold text-white">{perReal}</span> em receita.
          </p>
        </div>

        {/* Badge meta */}
        <div className="shrink-0">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-[0.06em] bg-white/[0.03] border border-white/[0.06] text-zinc-300 transition-transform duration-200 group-hover:scale-105"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0 shadow-sm",
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

      <p className="text-[11px] font-mono text-zinc-500 mt-4 pt-3.5 border-t border-white/[0.06] group-hover:text-zinc-400 transition-colors">
        {formatCurrency(revenue, { compact: true })} receita ÷{" "}
        {formatCurrency(invested, { compact: true })} investido
      </p>
    </Card>
  );
}