import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePeriodFilter, REFERENCE_TODAY } from "@/context/PeriodFilterContext";

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

/** Gera meses de Nov/2025 até o mês atual (inclusive). */
function buildMonths() {
  const months: { value: string; label: string }[] = [];
  const start = new Date(Date.UTC(2025, 10, 1)); // Nov 2025
  const end = new Date(Date.UTC(REFERENCE_TODAY.getFullYear(), REFERENCE_TODAY.getMonth(), 1));
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth();
    months.push({
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[m]} ${y}`,
    });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return months;
}

export function PeriodFilters() {
  const { filter, setMonth } = usePeriodFilter();
  const MONTHS = buildMonths();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Month select */}
      <Select
        value={filter.mode === "month" ? filter.month : ""}
        onValueChange={(v) => setMonth(v)}
      >
        {/* SelectTrigger: glass material com apple-press response em pointer-down */}
        <SelectTrigger
          className={cn(
            "apple-press h-9 w-[180px] text-xs font-mono rounded-xl",
            "bg-[rgba(10,10,13,0.72)] backdrop-blur-xl",
            "border border-white/[0.08] hover:border-white/[0.18]",
            "text-white shadow-[0_2px_12px_rgba(0,0,0,0.4)]",
            "transition-[border-color,box-shadow] duration-[80ms]",
            filter.mode === "month" && "border-blue-500/40 text-white font-semibold",
          )}
        >
          <SelectValue placeholder="Selecionar mês" />
        </SelectTrigger>
        <SelectContent className="bg-[#131318] border border-white/[0.12] rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value} className="text-xs font-mono text-zinc-300 focus:bg-white/[0.08] focus:text-white rounded-lg cursor-pointer py-2">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}