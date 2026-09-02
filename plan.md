# Plano de Implementação: Repaginação Visual Shadcn/ui Dark Mode

- [x] **Etapa 1: Tipografia Global & Tokens de Superfície (CSS e Tailwind)**
  - [x] Importar a fonte `Inter` no `src/index.css` e remover imports obsoletos de `Plus Jakarta Sans` e `JetBrains Mono`
  - [x] Configurar `Inter` como padrão em `tailwind.config.ts` (`fontFamily.sans`, `display`, `heading`, `mono`)
  - [x] Atualizar as variáveis de design no `:root` / Dark (`src/index.css`) para os valores oficiais de Dark Zinc da Shadcn (`--background`, `--card`, `--border`, `--popover`, `--muted`)
  - [x] Substituir utilitários de glassmorphism artificial por superfícies sólidas e foscas (`bg-zinc-900/60`, `border-zinc-800`)

- [x] **Etapa 2: Repaginação dos Componentes Base de KPI (`KpiCard` e `IndicatorCard`)**
  - [x] Redesenhar `src/components/dashboard/KpiCard.tsx` com a anatomia canônica do Shadcn:
    - [x] Título limpo em Inter (`text-sm font-medium text-zinc-400`)
    - [x] Ícone discreto no topo direito
    - [x] Valor grande e proeminente (`text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums`)
    - [x] Subtítulo / hint contextual em fonte Inter (`text-xs text-zinc-500`)
  - [x] Redesenhar `src/components/dashboard/IndicatorCard.tsx` (utilizado na aba de CAC) alinhando com a mesma anatomia e superfícies sólidas foscas

- [x] **Etapa 3: Repaginação da Barra Lateral (`AppSidebar.tsx`)**
  - [x] Ajustar o container para fundo sólido `#09090b` e contorno lateral `border-zinc-800`
  - [x] Padronizar tipografia e estados dos links de navegação (`text-sm font-medium`, ativo em `bg-zinc-800 text-white rounded-lg`)
  - [x] Alinhar o cabeçalho/logo e o botão de logout ao estilo limpo do Shadcn

- [x] **Etapa 4: Repaginação da Tela de Leads (`src/pages/Leads.tsx`)**
  - [x] Substituir o container de vidro por Card sólido Shadcn (`bg-zinc-900/50 border border-zinc-800 rounded-xl p-6`)
  - [x] Ajustar abas `<Tabs>` e `<TabsList>` para o padrão visual clássico do Shadcn
  - [x] Ajustar campo de pesquisa `<Input>` e botão de exportação
  - [x] Padronizar cabeçalhos e linhas da `<Table>` com tipografia Inter e divisores finos

- [x] **Etapa 5: Repaginação da Tela de CAC (`src/pages/Cac.tsx`)**
  - [x] Atualizar cards de métricas e blocos estatísticos da base do mês
  - [x] Atualizar a tabela de histórico mensal com bordas e espaçamentos no padrão Shadcn
  - [x] Remover classes remanescentes de fonte mono nos rótulos descritivos

- [x] **Etapa 6: Repaginação do Dashboard Geral (`src/pages/Index.tsx`) & Métricas (`src/pages/Metricas.tsx`)**
  - [x] Ajustar `CampaignsTable.tsx` com container sólido e tabela no padrão Shadcn
  - [x] Ajustar os containers de gráficos e funil (`FunnelEstimate.tsx`, `ComparisonCharts.tsx`, `RoasBox.tsx`)
  - [x] Ajustar a tela `Metricas.tsx` (Instagram Insights) com cards sólidos e pílulas de período limpas

- [x] **Etapa 7: Validação Técnica, Testes e Memória**
  - [x] Executar type-check (`npx tsc --noEmit`)
  - [x] Executar suíte de testes (`npm test`)
  - [x] Executar build de validação (`npm run build:dev`)
  - [x] Atualizar `CONTEXT.md` e `logs/session_log.md` com a entrega completa
