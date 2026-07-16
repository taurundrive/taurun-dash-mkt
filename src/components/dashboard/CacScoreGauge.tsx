import { Card } from "@/components/ui/card";
import { CacScore } from "@/lib/aggregations";

interface Props {
  score: CacScore;
  currentCac: number | null;
  targetCac: number;
}

export function CacScoreGauge({ score, currentCac, targetCac }: Props) {
  // Score ring: maps pct (0% = perfect) → fill arc
  const pct = Math.min(160, Math.max(0, score.pctOfTarget));
  // Use 75% of circle as the visible arc (270deg)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const visibleArc = circumference * 0.75;
  const filled = (Math.min(pct, 130) / 130) * visibleArc;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Score de Saúde do CAC</p>
          <p className="text-2xl font-bold mt-1" style={{ color: score.color }}>
            {score.label}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative w-[180px] h-[180px]">
          <svg viewBox="0 0 180 180" className="-rotate-[135deg]">
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${visibleArc} ${circumference}`}
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={score.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">
              {currentCac !== null ? `R$ ${currentCac.toFixed(0)}` : "—"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">CAC atual</span>
            <span className="text-[10px] text-muted-foreground mt-1">
              Meta: R$ {targetCac.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
        {score.message}
      </p>
    </Card>
  );
}