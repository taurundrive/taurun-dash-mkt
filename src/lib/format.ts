export const formatCurrency = (value: number, opts?: { compact?: boolean }) => {
  if (!isFinite(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: value >= 10000 ? 0 : 1,
      notation: value >= 1_000_000 ? "compact" : "standard",
    }).format(value);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number) => {
  if (!isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
};

export const formatPercent = (value: number, digits = 1) => {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")}%`;
};

export const formatDateBr = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};