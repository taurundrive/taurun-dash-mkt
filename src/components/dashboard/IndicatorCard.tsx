import { CSSProperties } from "react";
import { PaidIndicator } from "@/lib/aggregations";
import { cn } from "@/lib/utils";

interface Props {
  indicator: PaidIndicator;
  /** Índice no grid — usado para delay staggered */
  index?: number;
}

/**
 * IndicatorCard — Card de KPI com física Apple + entrada staggered.
 *
 * Animações implementadas:
 * 1. **Entrada staggered** via `card-animated` + `--stagger` CSS var
 *    - Delay: `index * 60ms` — cards entram em cascata no mount
 *    - Duration: 240ms ease-out, scale(0.96) + Y(8px) → normal
 * 2. **Badge color transition**: a cor do ponto muda com `transition 200ms`
 *    — quando o mês troca e o status muda (ex: "Bom" → "Atenção"), a transição
 *    suaviza a mudança de estado ao invés de trocar bruscamente
 * 3. **Apple press**: `active:scale(0.97)` em 80ms via `.apple-press`
 */
export function IndicatorCard({ indicator, index = 0 }: Props) {
  const { title, formula, benchmark, display, statusLabel, color } = indicator;

  return (
    <div
      className={cn(
        "card-animated apple-press",
        "relative overflow-hidden rounded-2xl cursor-default select-none",
        "flex flex-col justify-between gap-5",
        "bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl",
        "border border-white/[0.06] hover:border-white/[0.13]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]",
        "hover:shadow-[0_12px_40px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "transition-[border-color,box-shadow] duration-[120ms]",
        "p-6 group",
      )}
      style={{ "--stagger": index } as CSSProperties}
    >
      {/* Reflexo de superfície no topo */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none" />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors duration-[120ms]">
            {title}
          </p>
          <p className="text-[10px] font-mono text-zinc-600 mt-1 leading-relaxed">{formula}</p>
        </div>

        {/* Badge: âncora espacial — cor transiciona suavemente ao mudar de status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 bg-white/[0.03] border border-white/[0.06] transition-[border-color,background] duration-[120ms] group-hover:bg-white/[0.05] group-hover:border-white/[0.10]">
          {/* Ponto de status: transition-[background-color] 200ms permite que a cor
              mude suavemente quando o mês/dado muda — State Indication per Emil Kowalski */}
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: color,
              transition: "background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          />
          <span className="text-[10px] font-mono font-medium uppercase tracking-[0.06em] text-zinc-300">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div>
        {/* Número: tracking-[-0.03em] — optical sizing para displays grandes */}
        <div className="text-3xl font-bold font-sans tabular-nums tracking-[-0.03em] leading-none text-white">
          {display}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] group-hover:border-white/[0.09] transition-[border-color] duration-[120ms]">
          <p className="text-[11px] font-mono text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors duration-[120ms]">
            {benchmark}
          </p>
        </div>
      </div>
    </div>
  );
}