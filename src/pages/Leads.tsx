import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { supabase } from "@/integrations/supabase/client";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LeadRow {
  id: string;
  nome: string | null;
  telefone: string | null;
  mensagem: string | null;
  data_lead: string;
  created_at: string;
  vendedor: string | null;
}

type SellerFilter = "all" | "fernando" | "roberto" | "outros";

function normalizeSeller(v: string | null): SellerFilter {
  if (!v) return "outros";
  const s = v.trim().toLowerCase();
  if (s.includes("fernando")) return "fernando";
  if (s.includes("roberto")) return "roberto";
  return "outros";
}

function sellerLabel(v: string | null): string {
  if (!v) return "Não atribuído";
  return v;
}

function formatPhone(raw: string | null): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  // 55 11 96347 0019
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return raw;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEffectiveLeadTimestamp(row: LeadRow): string {
  if (!row.data_lead) return row.created_at || new Date().toISOString();
  const leadDate = new Date(row.data_lead);

  if (Number.isNaN(leadDate.getTime())) return row.created_at || new Date().toISOString();

  const isLegacyDateOnlyValue =
    leadDate.getUTCHours() === 3 &&
    leadDate.getUTCMinutes() === 0 &&
    leadDate.getUTCSeconds() === 0;

  return isLegacyDateOnlyValue ? (row.created_at || row.data_lead || new Date().toISOString()) : row.data_lead;
}

function displayLeadDate(row: LeadRow): string {
  const ts = getEffectiveLeadTimestamp(row);
  if (!ts) return "—";
  return formatDate(ts);
}

function leadDateIso(row: LeadRow): string {
  const ts = getEffectiveLeadTimestamp(row);
  if (!ts || typeof ts !== "string") return new Date().toISOString().slice(0, 10);
  return ts.slice(0, 10);
}

const PAGE_SIZE = 10;

function exportToExcel(rows: LeadRow[], filterLabel: string) {
  const data = rows.map((r) => ({
    Data: displayLeadDate(r),
    Nome: r.nome ?? "—",
    Telefone: formatPhone(r.telefone),
    Vendedor: sellerLabel(r.vendedor),
    Mensagem: r.mensagem ?? "—",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `leads-${filterLabel}-${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

let globalLeadsCache: LeadRow[] | null = null;

function LeadsContent() {
  const [rows, setRows] = useState<LeadRow[] | null>(globalLeadsCache);
  const [loading, setLoading] = useState(!globalLeadsCache);
  const [filter, setFilter] = useState<SellerFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const { range } = usePeriodFilter();

  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery, range.start, range.end]);

  useEffect(() => {
    let active = true;
    if (!globalLeadsCache) {
      setLoading(true);
    }
    const fetchRows = async () => {
      const { data, error } = await supabase
        .from("whatsapp_leads")
        .select("id, nome, telefone, mensagem, data_lead, created_at, vendedor")
        .order("data_lead", { ascending: false })
        .limit(500);
      if (!active) return;
      if (error) {
        console.error("[leads] fetch error:", error.message);
        if (!globalLeadsCache) setRows([]);
      } else {
        const nextRows = ((data ?? []) as LeadRow[]).sort(
          (a, b) =>
            new Date(getEffectiveLeadTimestamp(b)).getTime() -
            new Date(getEffectiveLeadTimestamp(a)).getTime(),
        );
        globalLeadsCache = nextRows;
        setRows(nextRows);
      }
      setLoading(false);
    };
    fetchRows();

    const channel = supabase
      .channel("whatsapp_leads_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_leads" },
        () => fetchRows(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const periodRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      const d = leadDateIso(r);
      return d >= range.start && d <= range.end;
    });
  }, [rows, range.start, range.end]);

  const fernandoCount = useMemo(() => {
    return periodRows.filter((r) => normalizeSeller(r.vendedor) === "fernando").length;
  }, [periodRows]);

  const robertoCount = useMemo(() => {
    return periodRows.filter((r) => normalizeSeller(r.vendedor) === "roberto").length;
  }, [periodRows]);

  const outrosCount = useMemo(() => {
    return periodRows.filter((r) => normalizeSeller(r.vendedor) === "outros").length;
  }, [periodRows]);

  const filteredBySeller = useMemo(() => {
    return filter === "all" ? periodRows : periodRows.filter((r) => normalizeSeller(r.vendedor) === filter);
  }, [filter, periodRows]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return filteredBySeller;
    const q = searchQuery.trim().toLowerCase();
    return filteredBySeller.filter((r) => {
      const nome = (r.nome ?? "").toLowerCase();
      const telefone = (r.telefone ?? "").toLowerCase();
      const mensagem = (r.mensagem ?? "").toLowerCase();
      const vendedor = sellerLabel(r.vendedor).toLowerCase();
      return nome.includes(q) || telefone.includes(q) || mensagem.includes(q) || vendedor.includes(q);
    });
  }, [filteredBySeller, searchQuery]);

  if (loading || !rows) {
    return (
      <div className="max-w-[1500px] mx-auto w-full py-20 text-center text-sm text-muted-foreground">
        Carregando leads...
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const tabs: Array<{ key: SellerFilter; label: string; count: number }> = [
    { key: "all", label: "Todos", count: periodRows.length },
    { key: "fernando", label: "Fernando", count: fernandoCount },
    { key: "roberto", label: "Roberto", count: robertoCount },
  ];
  if (outrosCount > 0) tabs.push({ key: "outros", label: "Não atribuído", count: outrosCount });

  return (
    <div className="flex flex-col gap-5 max-w-[1500px] mx-auto w-full">
      <section>
        <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 mb-3.5 px-1">
          Leads do WhatsApp — automação Z-API
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <KpiCard
            label="Total de leads"
            value={formatNumber(periodRows.length)}
            size="lg"
            hint="no período selecionado"
          />
          <KpiCard
            label="Fernando"
            value={formatNumber(fernandoCount)}
            hint={`${periodRows.length > 0 ? Math.round((fernandoCount / periodRows.length) * 100) : 0}% do período`}
          />
          <KpiCard
            label="Roberto"
            value={formatNumber(robertoCount)}
            hint={`${periodRows.length > 0 ? Math.round((robertoCount / periodRows.length) * 100) : 0}% do período`}
          />
        </div>
      </section>

      <div className="p-5 bg-[rgba(10,10,13,0.72)] backdrop-blur-2xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-200 ease-out group">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <span className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">Leads recebidos</span>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 transition-transform duration-200 group-hover:scale-105">
              tempo real
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0a0a0d] p-1.5 rounded-2xl border border-white/[0.06] w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={cn(
                  "apple-press-sm text-xs px-3.5 py-1.5 rounded-xl transition-all duration-150 font-mono flex items-center gap-2",
                  filter === t.key
                    ? "bg-white/[0.08] text-white font-semibold border border-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                    : "text-zinc-400 border border-transparent hover:text-white hover:bg-white/[0.03] font-medium",
                )}
              >
                {t.label}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-normal">
                  {formatNumber(t.count)}
                </span>
              </button>
            ))}
          </div>

          {/* Aba de pesquisa */}
          <div className="relative w-full md:w-80">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none transition-colors group-focus-within:text-zinc-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome ou telefone..."
              className="w-full pl-9 pr-8 py-2 text-xs font-sans font-medium text-white placeholder:text-zinc-500 bg-[#0a0a0d] border border-white/[0.08] hover:border-white/[0.14] focus:border-blue-500/40 focus:bg-[#0e0e13] focus:outline-none rounded-xl transition-all duration-150 shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="apple-press-sm absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                title="Limpar pesquisa"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                  Data
                </th>
                <th className="text-left text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                  Nome
                </th>
                <th className="text-left text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                  Telefone
                </th>
                <th className="text-left text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 pb-3 px-3">
                  Vendedor
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-xs font-mono text-zinc-500 py-12"
                  >
                    {searchQuery
                      ? `Nenhum lead encontrado para "${searchQuery}".`
                      : "Nenhum lead recebido ainda. Configure o n8n para enviar para o endpoint de ingestão."}
                  </td>
                </tr>
              )}
              {paginated.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.035] transition-colors cursor-pointer group/lead"
                >
                  <td className="px-3 py-3.5 text-xs text-zinc-400 tabular-nums font-mono align-middle whitespace-nowrap">
                    {displayLeadDate(r)}
                  </td>
                  <td className="px-3 py-3.5 text-xs font-medium text-zinc-100 align-middle group-hover/lead:text-white transition-colors">
                    {r.nome ?? "—"}
                  </td>
                  <td className="px-3 py-3.5 text-xs text-zinc-300 tabular-nums font-mono align-middle whitespace-nowrap">
                    {formatPhone(r.telefone)}
                  </td>
                  <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                    {r.vendedor ? (
                      <span
                        className={cn(
                          "inline-block text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full border",
                          normalizeSeller(r.vendedor) === "fernando" &&
                            "bg-purple-500/15 text-purple-300 border-purple-500/30",
                          normalizeSeller(r.vendedor) === "roberto" &&
                            "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                          normalizeSeller(r.vendedor) === "outros" &&
                            "bg-white/[0.04] text-zinc-400 border-white/[0.08]",
                        )}
                      >
                        {sellerLabel(r.vendedor)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <span className="text-[11px] text-zinc-500 font-mono">
              Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} de {formatNumber(filtered.length)}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="apple-press text-xs font-mono font-medium px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              >
                Anterior
              </button>
              <span className="text-xs font-mono tabular-nums text-zinc-300 font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="apple-press text-xs font-mono font-medium px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Leads() {
  return (
    <DashboardLayout title="Leads do WhatsApp">
      <LeadsContent />
    </DashboardLayout>
  );
}
