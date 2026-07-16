import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { CampaignAggregate } from "@/lib/aggregations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "all" | "conversas" | "alcance";

function shortType(type: string): string {
  if (type.startsWith("Conversas")) return "Mensagens";
  if (type.toLowerCase().includes("alcance")) return "Alcance";
  if (type.toLowerCase().includes("destaque")) return "Dest. página";
  return type;
}

function convTone(conv: number | null) {
  if (conv === null) return null;
  if (conv >= 25) return "good";
  if (conv >= 15) return "mid";
  return "low";
}

function spendTone(spend: number, max: number) {
  if (max <= 0) return "good";
  const pct = spend / max;
  if (pct < 0.45) return "good";
  if (pct < 0.75) return "mid";
  return "low";
}

export function CampaignsTable({ rows }: { rows: CampaignAggregate[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "conversas") return rows.filter((r) => r.conversion !== null);
    return rows.filter((r) => r.conversion === null);
  }, [rows, tab]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.leads - a.leads),
    [filtered],
  );
  const maxSpend = useMemo(
    () => Math.max(...sorted.map((r) => r.invested), 1),
    [sorted],
  );

  return (
    <Card className="p-5 bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl hover:border-white/[0.15] transition-all duration-200 ease-out group">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">Campanhas — tráfego pago</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-3 py-1 rounded-full bg-primary/15 text-primary font-mono font-semibold uppercase tracking-wider border border-primary/30 transition-transform duration-200 group-hover:scale-105">
            Período atual
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-[#0a0a0d] p-1.5 rounded-2xl border border-white/[0.06] mb-4 w-fit">
        {(
          [
            ["all", "Todas"],
            ["conversas", "Conversas"],
            ["alcance", "Alcance"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "apple-press-sm text-xs px-3.5 py-1.5 rounded-xl transition-all duration-150 font-mono",
              tab === k
                ? "bg-white/[0.08] text-white font-semibold border border-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                : "text-zinc-400 border border-transparent hover:text-white hover:bg-white/[0.03] font-medium",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                Campanha
              </th>
              {tab === "conversas" && (
                <th className="text-right text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                  Cliques
                </th>
              )}
              <th className="text-right text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                Leads
              </th>
              <th className="text-right text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3 min-w-[140px]">
                Valor gasto
              </th>
              <th className="text-right text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                Conv.
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={tab === "conversas" ? 5 : 4} className="text-center text-xs font-mono text-zinc-500 py-10">
                  Sem dados para o período selecionado.
                </td>
              </tr>
            )}
            {sorted.map((c) => {
              const ct = convTone(c.conversion);
              const fillPct = Math.min(95, (c.invested / maxSpend) * 100);
              return (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.035] transition-colors group/row cursor-pointer"
                >
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1 h-6 rounded-full shrink-0 bg-white/20 group-hover/row:bg-white/60 transition-colors" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium font-sans text-zinc-100 truncate max-w-[220px] group-hover/row:text-white transition-colors">
                          {c.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                            {shortType(c.type)}
                          </span>
                          {!c.computesRoas && (
                            <span
                              className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] text-zinc-500 border border-white/[0.06]"
                              title="Não entra no cálculo de ROAS/CAC"
                            >
                              Fora ROAS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {tab === "conversas" && (
                    <td className="px-3 py-3.5 text-right text-xs font-mono text-zinc-300 tabular-nums align-middle">
                      {formatNumber(c.clicks)}
                    </td>
                  )}
                  <td className="px-3 py-3.5 text-right text-xs font-mono text-zinc-200 tabular-nums align-middle font-semibold">
                    {formatNumber(c.leads)}
                  </td>
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center gap-2.5 justify-end">
                      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden min-w-[40px] max-w-[80px]">
                        <div
                          className="h-full rounded-full bg-white/40 group-hover/row:bg-white/70 transition-all duration-300"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white tabular-nums font-mono font-semibold">
                        {formatCurrency(c.invested)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right align-middle">
                    {ct === null ? (
                      <span className="text-[11px] font-mono text-zinc-600">—</span>
                    ) : (
                      <span className="inline-block text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-white/[0.05] text-zinc-200 border border-white/[0.08]">
                        {formatPercent(c.conversion ?? 0)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}