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
        // Entrada staggered — animation-delay via CSS custom property
        "card-animated apple-press",
        "relative overflow-hidden rounded-2xl cursor-default select-none",
        // Glass material base
        "bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl",
        "border border-white/[0.06] hover:border-white/[0.14]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]",
        "hover:shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)]",
        "transition-[border-color,box-shadow,background] duration-[120ms]",
        "p-5 group",
        className,
      )}
      // Injetar o índice como custom property para o CSS calcular o delay
      style={{ "--stagger": index } as CSSProperties}
    >
      {/* Reflexo interno no topo — simula superfície de material Apple */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors duration-[120ms]">
          {label}
        </p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-zinc-400 group-hover:border-white/[0.14] group-hover:text-zinc-200 transition-[border-color,color] duration-[120ms]">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
          </div>
        )}
      </div>

      {/* Valor — tracking negativo óptico para displays grandes (SF Pro Display style) */}
      <p
        className={cn(
          "tabular-nums font-sans text-white leading-none",
          size === "lg"
            ? "font-bold text-2xl sm:text-3xl tracking-[-0.03em]"
            : "font-semibold text-xl sm:text-2xl tracking-tight",
        )}
      >
        {value}
      </p>

      {hint && (
        <p
          className={cn(
            "text-[11px] mt-2.5 font-mono tracking-tight transition-colors duration-[120ms]",
            hintTone === "up" && "text-emerald-400 font-medium",
            hintTone === "down" && "text-red-400 font-medium",
            hintTone === "neutral" && "text-zinc-500 group-hover:text-zinc-400",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}