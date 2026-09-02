# Especificação Técnica: Repaginação Visual Shadcn/ui Dark Mode

## 1. Visão Geral e Objetivo
Transformar a camada visual do **taurun-dash-mkt** para o padrão canônico do **shadcn/ui Dark Theme** (referência da documentação oficial):
- **Tipografia:** Migração global e unificada para a fonte **Inter** (Google Fonts) em 100% dos textos, rótulos e números (com `tabular-nums`), eliminando `Plus Jakarta Sans` e os rótulos minúsculos em `JetBrains Mono`.
- **Superfícies & Cores:** Substituição do efeito de vidro/glassmorphism translúcido denso por superfícies sólidas foscas em tons de Dark Zinc (`#09090b` para o fundo raiz, `#121215` / `#18181b` para cards e containers, contornos nítidos e sutis `border-zinc-800` / `border-border`).
- **Cards de Métricas (KPIs):** Redesenho da anatomia de `KpiCard` e `IndicatorCard` para o padrão Shadcn (título legível em Inter `text-sm font-medium text-zinc-400`, valor proeminente `text-2xl sm:text-3xl font-bold tracking-tight text-white`, badges contextuais discretos).
- **Controles e Navegação:** Padronização dos botões, abas (`<Tabs>`), campos de busca (`<Input>`) e navegação lateral (`AppSidebar`) no estilo canônico da biblioteca.
- **Preservação de Regras:** 100% dos hooks, conexões Supabase, Meta Ads API, Google Sheets e cálculos de métricas financeiras (ROAS, CAC, CPL) permanecem estritamente inalterados.

---

## 2. Tokens de Design & Tipografia

### 2.1. Tipografia (Inter)
- **Import:** `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');`
- **Variáveis Tailwind (`tailwind.config.ts`):**
  - `fontFamily.sans`: `['Inter', 'system-ui', 'sans-serif']`
  - `fontFamily.mono`: `['Inter', 'ui-monospace', 'monospace']` (ou fallback tabular)
- **Títulos e Rótulos:**
  - Substituição de `text-[11px] font-mono uppercase tracking-wider text-zinc-500` por `text-sm font-medium text-zinc-400 font-sans tracking-normal`.
  - Valores: `text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-sans tabular-nums`.

### 2.2. Superfícies & Paleta de Cores (`src/index.css`)
- **Fundo Raiz (`:root / dark`):** `--background: 240 10% 3.9%` (`#09090b`).
- **Superfície de Cards:** `--card: 240 6% 7%` (`#121215`) com borda `--border: 240 4% 16%` (`#27272a` / `zinc-800`).
- **Popovers / Modais:** `--popover: 240 6% 9%` (`#18181b`).
- **Muted / Inativo:** `--muted: 240 4% 12%` (`#1e1e23`), `--muted-foreground: 240 5% 65%`.
- **Eliminação de Vidro Artificial:** Remoção de `backdrop-blur-2xl` e `bg-[rgba(10,10,13,0.72)]` dos cards, substituindo por classes de superfície sólida com leve elevação `bg-zinc-900/60 border border-zinc-800/80 shadow-sm rounded-xl`.

---

## 3. Especificação por Módulo & Componente

### 3.1. Cards de KPI (`KpiCard.tsx` e `IndicatorCard.tsx`)
- **Container:** `<div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-sm hover:border-zinc-700/80 transition-all duration-150">`
- **Cabeçalho:** Label em Inter `text-sm font-medium text-zinc-400` + Ícone sutil no canto superior direito (`text-zinc-400 w-4 h-4`).
- **Valor:** `text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums`.
- **Rodapé / Contexto:** `text-xs text-zinc-500 mt-2 flex items-center gap-1.5`.

### 3.2. Aba de Leads (`src/pages/Leads.tsx`)
- **Container da Tabela:** Card sólido Shadcn (`bg-zinc-900/50 border border-zinc-800 rounded-xl p-6`).
- **Abas (`<Tabs>`):** Estilo Shadcn clássico (`bg-zinc-900 border border-zinc-800/80 p-1 rounded-lg`), aba ativa em `bg-zinc-800 text-zinc-100 shadow-sm`.
- **Busca:** `<Input>` com `bg-zinc-900/80 border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400 rounded-lg text-sm text-zinc-200`.
- **Tabela:** Header em Inter `text-xs font-medium text-zinc-400 uppercase tracking-wider`, linhas com divisor fino `border-b border-zinc-800/60` e hover sutil `hover:bg-zinc-800/30`.
- **Badges:** Badges discretos Shadcn para vendedor (`border border-zinc-700/60 bg-zinc-800/50 text-zinc-300`).

### 3.3. Aba de CAC (`src/pages/Cac.tsx`)
- **Indicadores:** Padronização nos cards `IndicatorCard` atualizados.
- **Tabela Histórica:** Substituição das células customizadas por linhas Shadcn padronizadas com destaque discreto no mês selecionado.

### 3.4. Barra Lateral (`AppSidebar.tsx`)
- **Fundo:** Sólido `#09090b` com divisor `border-r border-zinc-800/80`.
- **Itens de Menu:** Formato clássico Shadcn: ícone Lucide + texto `text-sm font-medium`, estado inativo `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg`, estado ativo `bg-zinc-800 text-white font-semibold rounded-lg`.

### 3.5. Dashboard Geral (`Index.tsx`, `CampaignsTable.tsx`, `FunnelEstimate.tsx`, `ComparisonCharts.tsx`)
- **Containers:** Atualização de todos os painéis e gráficos para usar a base de card Shadcn com borda e fundo em Zinc sólido.
- **Tipografia:** Aplicação da fonte Inter em todos os títulos, legendas e rótulos de dados.

---

## 4. Validação & QA
1. **Type-Check:** Ausência de erros com `npx tsc --noEmit`.
2. **Suíte de Testes:** Execução de `npm test` garantindo integridade dos componentes.
3. **Build de Validação:** `npm run build:dev` executado com sucesso.
4. **Inspeção Visual:** Validação local no servidor Vite ativo em `http://localhost:8080/`.
