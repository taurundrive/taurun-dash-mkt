import { CSSProperties } from "react";
import { HelpCircle } from "lucide-react";
import { PaidIndicator } from "@/lib/aggregations";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  indicator: PaidIndicator;
  /** Índice no grid — usado para delay staggered */
  index?: number;
}

function getHelpDescription(key: string): string {
  switch (key) {
    case "roas":
      return "ROAS Pago (Retorno sobre Investimento em Mídia): Mede a eficiência do investimento de tráfego pago considerando apenas a receita das vendas de leads do WhatsApp correspondidos na safra.";
    case "costRevenue":
    case "cost_revenue":
      return "Custo de Mídia / Receita: Percentual da receita paga que foi consumido pelo investimento em anúncios. Idealmente abaixo de 15%.";
    case "cac":
      return "CAC Pago (Custo de Aquisição de Cliente): Custo médio de mídia para adquirir um cliente pago. O cálculo divide o investimento total pelas vendas associadas a leads do WhatsApp daquela safra.";
    case "conversion":
      return "Taxa de Conversão de Vendas: Percentual de leads de WhatsApp que converteram em vendas no período correspondente.";
    case "cpl":
      return "CPL Médio (Custo por Lead): Investimento de anúncios de conversão dividido pelo total de leads de WhatsApp recebidos.";
    default:
      return "";
  }
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
  const helpDesc = getHelpDescription(indicator.key);

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
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors duration-[120ms]">
              {title}
            </p>
            {helpDesc && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors outline-none apple-press-sm">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] bg-[#131318] border border-white/[0.08] text-xs text-zinc-300 p-2.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  {helpDesc}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-[11px] font-mono text-zinc-600 mt-1 leading-relaxed">{formula}</p>
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
          <span className="text-[11px] font-mono font-medium uppercase tracking-[0.06em] text-zinc-300">
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