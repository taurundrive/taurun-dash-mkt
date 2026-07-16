import { cn } from "@/lib/utils";

/**
 * CardSkeleton — Estado de carregamento com shimmer premium.
 *
 * Filosofia Emil Kowalski / Apple:
 * - Skeleton shapes devem replicar a estrutura exata do card real (mesmas proporções)
 * - O shimmer percorre da esquerda para a direita — sugere "carregando dados"
 * - Nunca usar spinner + texto "Carregando" — skeletons são mais informativos e elegantes
 * - Duração do shimmer: 1.8s linear infinite — lento o suficiente para não distrair
 *
 * @prop size - "sm" | "lg" — espelha o tamanho do KpiCard correspondente
 * @prop className - classes adicionais para layout externo
 */
export function CardSkeleton({
  size = "sm",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl",
        "border border-white/[0.06]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        "p-5",
        className,
      )}
      aria-hidden="true" // Ocultar do screen reader — sem dados para comunicar
    >
      {/* Shimmer overlay — percorre da esquerda para a direita */}
      <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />

      {/* Label placeholder — mesma proporção do texto uppercase mono */}
      <div className="w-24 h-2.5 rounded-full bg-white/[0.06] mb-4" />

      {/* Valor placeholder */}
      <div
        className={cn(
          "rounded-lg bg-white/[0.06]",
          size === "lg" ? "h-9 w-3/4" : "h-7 w-1/2",
        )}
      />

      {/* Hint placeholder — só aparece no tamanho sm */}
      {size === "sm" && (
        <div className="w-16 h-2 rounded-full bg-white/[0.04] mt-3" />
      )}
    </div>
  );
}

/**
 * IndicatorCardSkeleton — Estado de carregamento do IndicatorCard (CAC).
 *
 * Replica as 3 zonas do card: cabeçalho (título + badge), número grande, benchmark.
 */
export function IndicatorCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl",
        "border border-white/[0.06]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        "p-6 flex flex-col justify-between gap-5",
        className,
      )}
      aria-hidden="true"
    >
      {/* Shimmer overlay */}
      <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />

      {/* Cabeçalho: título + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="w-28 h-2.5 rounded-full bg-white/[0.06]" />
          <div className="w-20 h-2 rounded-full bg-white/[0.04]" />
        </div>
        {/* Badge placeholder */}
        <div className="w-16 h-6 rounded-lg bg-white/[0.04] border border-white/[0.04]" />
      </div>

      {/* Número grande */}
      <div>
        <div className="h-9 w-2/5 rounded-lg bg-white/[0.07]" />
        {/* Linha separadora + benchmark */}
        <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-1.5">
          <div className="w-full h-2 rounded-full bg-white/[0.04]" />
          <div className="w-4/5 h-2 rounded-full bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}
