import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export type PeriodMode = "preset" | "month" | "custom";
export type PresetDays = 7 | 15 | 30;

export interface PeriodFilter {
  mode: PeriodMode;
  preset: PresetDays;
  /** ISO yyyy-mm */
  month: string;
  /** ISO yyyy-mm-dd */
  customStart?: string;
  customEnd?: string;
}

/** Reference "today" — uses the real current date. */
export const REFERENCE_TODAY = new Date();

const DEFAULT_FILTER: PeriodFilter = {
  mode: "month",
  preset: 30,
  month: `${REFERENCE_TODAY.getFullYear()}-${String(REFERENCE_TODAY.getMonth() + 1).padStart(2, "0")}`,
};

interface Ctx {
  filter: PeriodFilter;
  setPreset: (days: PresetDays) => void;
  setMonth: (yyyymm: string) => void;
  setCustom: (start: string, end: string) => void;
  /** Resolved [start, end] inclusive ISO dates */
  range: { start: string; end: string };
  label: string;
}

const PeriodFilterContext = createContext<Ctx | null>(null);

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function resolveRange(f: PeriodFilter): { start: string; end: string } {
  if (f.mode === "preset") {
    const end = new Date(REFERENCE_TODAY);
    const start = new Date(REFERENCE_TODAY);
    start.setDate(start.getDate() - (f.preset - 1));
    return { start: fmt(start), end: fmt(end) };
  }
  if (f.mode === "month") {
    const [y, m] = f.month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));
    return { start: fmt(start), end: fmt(end) };
  }
  return { start: f.customStart ?? fmt(REFERENCE_TODAY), end: f.customEnd ?? fmt(REFERENCE_TODAY) };
}

function resolveLabel(f: PeriodFilter): string {
  if (f.mode === "preset") return `Últimos ${f.preset} dias`;
  if (f.mode === "month") {
    const [y, m] = f.month.split("-").map(Number);
    const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return `${months[m - 1]} ${y}`;
  }
  return `${f.customStart} → ${f.customEnd}`;
}

export function PeriodFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<PeriodFilter>(DEFAULT_FILTER);

  const value = useMemo<Ctx>(() => ({
    filter,
    setPreset: (days) => setFilter((p) => ({ ...p, mode: "preset", preset: days })),
    setMonth: (yyyymm) => setFilter((p) => ({ ...p, mode: "month", month: yyyymm })),
    setCustom: (start, end) => setFilter((p) => ({ ...p, mode: "custom", customStart: start, customEnd: end })),
    range: resolveRange(filter),
    label: resolveLabel(filter),
  }), [filter]);

  return <PeriodFilterContext.Provider value={value}>{children}</PeriodFilterContext.Provider>;
}

export function usePeriodFilter() {
  const ctx = useContext(PeriodFilterContext);
  if (!ctx) throw new Error("usePeriodFilter must be used inside PeriodFilterProvider");
  return ctx;
}