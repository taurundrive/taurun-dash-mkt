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
            "h-9 w-[180px] text-sm font-medium rounded-lg",
            "bg-zinc-900 border border-border hover:bg-zinc-800/60",
            "text-zinc-100 shadow-sm transition-colors",
          )}
        >
          <SelectValue placeholder="Selecionar mês" />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border rounded-lg shadow-md">
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value} className="text-sm text-zinc-200 focus:bg-zinc-800 focus:text-white rounded-md cursor-pointer py-1.5">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}