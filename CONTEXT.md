# CONTEXT.md — Fonte Única da Verdade & Memória Contínua (taurun-dash-mkt)

## 1. Estado Atual & Arquitetura Consolidada
- **Ambiente & Stack**: React 18 + Vite + TypeScript + Tailwind CSS + Shadcn/ui (Radix UI) + Supabase + TanStack React Query + Lucide React.
- **Design System Oficial**: **Shadcn/ui Canonical Dark Theme (Dark Zinc)**:
  - Fundo raiz: Dark Zinc Profundo (`#09090b` / `240 10% 3.9%`).
  - Superfícies e Cards: Sólidos foscos em Zinc 900 (`#0f0f12` a `#121215`) sem vidro artificial/glassmorphism.
  - Bordas: Contornos nítidos e sutis `border-border` (`#27272a` / `240 3.7% 15.9%`).
  - Tipografia: **Inter** (Google Fonts) em 100% dos textos, títulos e números (com `tabular-nums` e `tracking-tight`).
  - Cards de KPI: Títulos limpos (`text-sm font-medium text-muted-foreground`), valores grandes (`text-2xl sm:text-3xl font-bold tracking-tight text-white`), hints discretos (`text-xs text-muted-foreground`).
  - Navegação e Abas: `<Tabs>` clássico do shadcn com aba ativa em `bg-zinc-800 text-white shadow-sm`. Sidebar limpo com lista sólida e ícones Lucide.
- **Rotas & Módulos**:
  - `/` (Performance Geral): KPIs de vendas, campanhas, leads, investimento e CPL em cards canônicos; funil de conversão sólido; tabela de campanhas e gráficos comparativos Recharts.
  - `/cac` (CAC & Performance Paga): Indicadores de ROAS, custo/receita, CAC, conversão e CPL; resumo da base do mês em card sólido e tabela de histórico mensal com linha ativa sutil.
  - `/leads` (Leads do WhatsApp): Automação Z-API em tempo real, filtros por abas de vendedor (`Tabs`), busca com `<Input>` e ícone Lucide, tabela limpa com `<Table>` e paginação com `<Pagination>`.
  - `/metricas` (Instagram Insights): KPIs de alcance, impressões, seguidores e engajamento; pílulas de período (`7d / 15d / 30d`) no padrão shadcn.

---

## 2. Histórico & Logs da Sessão (02/09/2026)

### Repaginação Visual Shadcn/ui Dark Theme (Inter 100% + Superfícies Dark Zinc)
1. **Tipografia Global & Setup de Fonte**:
   - `index.html`: Substituído o link de DM Sans/Mono pelo Google Font oficial `Inter` (pesos 300 a 800).
   - `src/index.css`: Import oficial de `Inter`, remoção das famílias `Plus Jakarta Sans` e `JetBrains Mono`. Aplicada fonte `Inter` em `html`, `body`, `code`, `pre` e `.font-mono` com suporte a `tabular-nums`.
   - `tailwind.config.ts`: Configurado `fontFamily.sans`, `mono`, `display` e `heading` para utilizar `'Inter', sans-serif`.
2. **Tokens de Superfície e Remoção de Vidro/Glassmorphism**:
   - Atualizadas variáveis CSS no `:root` / Dark (`--background: 240 10% 3.9%`, `--card: 240 6% 6%`, `--border: 240 3.7% 15.9%`, `--popover: 240 5% 9%`).
   - Eliminadas classes e utilitários de `backdrop-blur-2xl` e `bg-[rgba(10,10,13,0.72)]`, substituindo por cards sólidos foscas `bg-card border border-border shadow-sm rounded-xl`.
3. **Anatomia dos Cards de KPI (`KpiCard.tsx` e `IndicatorCard.tsx`)**:
   - Redesenhados para o padrão canônico da biblioteca:
     - Título legível em Inter (`text-sm font-medium text-muted-foreground`).
     - Ícone discreto em container `bg-zinc-800/60 border border-border/60 text-zinc-400`.
     - Valor destacado em `text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums`.
     - Hint contextual em Inter `text-xs text-muted-foreground`.
4. **Sidebar & Layout (`AppSidebar.tsx` e `DashboardLayout.tsx`)**:
   - Barra lateral sólida com fundo `#09090b` e borda `border-border`.
   - Itens de menu no padrão clássico Shadcn: `text-sm font-medium text-muted-foreground hover:bg-zinc-800/60 hover:text-white rounded-lg`, ativo com `bg-zinc-800 text-white shadow-sm`.
   - Cabeçalho superior com fundo sólido sutil e tipografia em Inter.
5. **Páginas Repaginadas (`Leads.tsx`, `Cac.tsx`, `CampaignsTable.tsx`, `FunnelEstimate.tsx`, `ComparisonCharts.tsx`, `RoasBox.tsx`, `Metricas.tsx`)**:
   - Todos os containers migrados para cards sólidos foscas `rounded-xl border border-border`.
   - Abas `<Tabs>` convertidas para o estilo canônico da biblioteca.
   - Tabelas com cabeçalhos `text-xs font-medium text-muted-foreground`, linhas limpas e hover suave `hover:bg-zinc-800/30`.
   - Gráficos comparativos e barras de funil alinhados com a paleta Zinc.
6. **Validação Técnica**:
   - Suíte de testes (`npm test`): 6/6 testes passaram com sucesso no Vitest.
   - Type-check (`npx tsc --noEmit`): 0 erros de tipagem.
   - Build de validação (`npm run build:dev`): Vite compilou com sucesso em 13.97s.

---

## 3. Decisões Técnicas & Padrões Adotados
- **Inter Everywhere**: Adoção estrita de uma única família tipográfica para todo o produto, trazendo consistência e sobriedade.
- **Fidelidade à Documentação Shadcn**: Eliminação de efeitos experimentais de vidro para abraçar a estética "Dark Zinc" nativa e fosca.
- **Paleta Oficial Shadcn nos Gráficos**: Gráficos Recharts (`ComparisonCharts.tsx`) migrados para a paleta monocromática Zinc/White de alto contraste (branco `#ffffff` para alta performance, `zinc-400` para média e `zinc-600` para baixa), idêntico à documentação oficial do Shadcn.
- **Botões e Badges Oficiais**: Botão primário com alto contraste em branco sólido (`bg-white text-zinc-950 hover:bg-zinc-200`) e badges em `bg-zinc-800/80 border-border text-zinc-200`.
- **Zero Impacto em Regras de Negócio**: Preservação total de queries, mutations, hooks de período e regras de atribuição de safra e cálculo de ROAS/CAC.

