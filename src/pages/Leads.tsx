import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Search, X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
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
      // Busca os leads no Supabase sem o limite restritivo de 500 itens.
      // Limite expandido para 50.000 para garantir a exibição completa de 100% dos leads do mês selecionado.
      const { data, error } = await supabase
        .from("whatsapp_leads")
        .select("id, nome, telefone, mensagem, data_lead, created_at, vendedor")
        .order("data_lead", { ascending: false })
        .limit(50000);
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
    <div className="flex flex-col gap-6 max-w-[1500px] mx-auto w-full">
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-0.5">
          Leads do WhatsApp — automação Z-API
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

      <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
        {/* Cabeçalho do Card com Status e Ação de Exportar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-zinc-100">
              Leads recebidos
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 font-medium border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              tempo real
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => exportToExcel(filtered, filter)}
            className="h-8 px-3 text-xs font-medium rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-zinc-950" />
            Exportar Excel
          </Button>
        </div>

        {/* Barra de Filtros (Tabs) e Campo de Busca (Input) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as SellerFilter)}>
            <TabsList className="h-9 p-1 bg-zinc-900 border border-border rounded-lg flex flex-wrap gap-1 w-fit">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="h-7 px-3 text-xs font-medium rounded-md transition-colors data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-zinc-200 flex items-center gap-2"
                >
                  {t.label}
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-300 font-normal">
                    {formatNumber(t.count)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Campo de pesquisa oficial Shadcn */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome ou telefone..."
              className="h-9 pl-9 pr-8 text-sm text-zinc-100 placeholder:text-muted-foreground bg-zinc-900 border border-border focus-visible:ring-1 focus-visible:ring-zinc-400 rounded-lg"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-zinc-200 hover:bg-transparent"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabela de Leads Shadcn/ui */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-900/50 [&_tr]:border-b-border">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-left text-xs font-medium text-muted-foreground h-9 px-4">
                  Data
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-muted-foreground h-9 px-4">
                  Nome
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-muted-foreground h-9 px-4">
                  Telefone
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-muted-foreground h-9 px-4">
                  Vendedor
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground py-12"
                  >
                    {searchQuery
                      ? `Nenhum lead encontrado para "${searchQuery}".`
                      : "Nenhum lead recebido ainda. Configure o n8n para enviar para o endpoint de ingestão."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => (
                  <TableRow
                    key={r.id}
                    className="border-b border-border/60 hover:bg-zinc-800/30 transition-colors"
                  >
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {displayLeadDate(r)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-zinc-100">
                      {r.nome ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-zinc-300 tabular-nums whitespace-nowrap">
                      {formatPhone(r.telefone)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {r.vendedor ? (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium px-2.5 py-0.5 rounded-md border border-border bg-zinc-800/80 text-zinc-200"
                        >
                          {sellerLabel(r.vendedor)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação Shadcn/ui */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3">
            <span className="text-xs text-muted-foreground font-normal">
              Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} de {formatNumber(filtered.length)}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 px-3 text-xs font-medium rounded-lg border-border text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Anterior
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <span className="text-xs tabular-nums text-zinc-300 font-medium px-2">
                    {currentPage} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-3 text-xs font-medium rounded-lg border-border text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Próxima
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
