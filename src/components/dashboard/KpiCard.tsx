import { CSSProperties } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  rawValue?: number | null; // valor numérico bruto para o counter animation
  icon?: LucideIcon;
  hint?: string;
  hintTone?: "neutral" | "up" | "down";
  size?: "sm" | "lg";
  /** Índice no grid — usado para calcular o delay de entrada staggered */
  index?: number;
  className?: string;
}

/**
 * KpiCard — Material translúcido com física Apple + animações Emil Kowalski.
 *
 * Animações implementadas:
 * 1. **Entrada staggered** (card-enter @keyframes): scale(0.96)+Y(8px) → normal
 *    - Delay: `index * 60ms` — cada card entra 60ms após o anterior
 *    - Duration: 240ms ease-out — dentro do budget de "occasional"
 * 2. **Apple press**: `active:scale(0.97)` em 80ms no pointer-down
 * 3. **Glass material**: backdrop-blur-2xl + borda translúcida
 *
 * Nota: o number roll foi removido do KpiCard porque os valores chegam
 * pré-formatados como string (ex: "R$ 1.2M") — o counter fica no nível da página
 * onde o valor raw está disponível como número.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  hintTone = "neutral",
  size = "sm",
  index = 0,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "card-animated",
        "relative overflow-hidden rounded-xl cursor-default select-none",
        "bg-card border border-border/80 hover:border-zinc-700/80",
        "shadow-sm transition-all duration-150",
        "p-5 group",
        className,
      )}
      style={{ "--stagger": index } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-sm font-medium text-muted-foreground group-hover:text-zinc-300 transition-colors">
          {label}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800/60 border border-border/60 text-zinc-400 group-hover:text-zinc-200 transition-colors">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </div>
        )}
      </div>

      <p
        className={cn(
          "tabular-nums font-bold text-white tracking-tight leading-none",
          size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
        )}
      >
        {value}
      </p>

      {hint && (
        <p
          className={cn(
            "text-xs mt-2.5 font-normal tracking-normal transition-colors",
            hintTone === "up" && "text-emerald-400 font-medium",
            hintTone === "down" && "text-red-400 font-medium",
            hintTone === "neutral" && "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}