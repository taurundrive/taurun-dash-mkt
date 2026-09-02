import { CSSProperties } from "react";
import { HelpCircle } from "lucide-react";
import { PaidIndicator } from "@/lib/aggregations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        "card-animated",
        "relative overflow-hidden rounded-xl cursor-default select-none",
        "flex flex-col justify-between gap-4",
        "bg-card border border-border/80 hover:border-zinc-700/80",
        "shadow-sm transition-all duration-150",
        "p-5 sm:p-6 group",
      )}
      style={{ "--stagger": index } as CSSProperties}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-zinc-300 transition-colors">
              {title}
            </p>
            {helpDesc && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-muted-foreground hover:text-zinc-200 transition-colors p-0 hover:bg-transparent"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] bg-popover border border-border text-xs text-zinc-300 p-2.5 rounded-lg shadow-md">
                  {helpDesc}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{formula}</p>
        </div>

        {/* Badge: status indicator */}
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shrink-0 bg-zinc-800/60 border-border text-xs font-normal"
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium text-zinc-300">
            {statusLabel}
          </span>
        </Badge>
      </div>

      {/* Corpo */}
      <div>
        <div className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight leading-none text-white">
          {display}
        </div>

        <div className="mt-3.5 pt-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {benchmark}
          </p>
        </div>
      </div>
    </div>
  );
}