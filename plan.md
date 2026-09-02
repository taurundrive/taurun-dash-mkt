# Plano de Implementação: Painel de Publicações e Performance do Instagram (`/metricas`)

- [x] **Etapa 1: Serviço de Busca e Cache da Meta Graph API (`fetchInstagramPosts.ts`)**
  - [x] Criar `src/integrations/meta/fetchInstagramPosts.ts` com funções para buscar dados do perfil e mídias
  - [x] Implementar busca paralela de métricas detalhadas por post (`/insights` para Reels e Feed)
  - [x] Implementar cache multi-nível (em memória + `sessionStorage` com TTL de 15 minutos) e função de invalidação
  - [x] Implementar cálculo das métricas agregadas do mês (Total de views, alcance, interações, taxa de engajamento)

- [x] **Etapa 2: Componente dos Top 3 Posts em Destaque (`InstagramTopPosts.tsx`)**
  - [x] Criar `src/components/dashboard/InstagramTopPosts.tsx`
  - [x] Exibir os 3 posts com mais visualizações/alcance em cards com thumbnail, badge de ranking (#1, #2, #3), formato (Reels/Carrossel/Foto), métricas em destaque e link pro Instagram

- [x] **Etapa 3: Componente da Tabela Analítica de Publicações (`InstagramPostsTable.tsx`)**
  - [x] Criar `src/components/dashboard/InstagramPostsTable.tsx` utilizando `<Table>` e `<Select>` do Shadcn
  - [x] Implementar seletor de ordenação: "Mais visualizados (Padrão)", "Mais recentes", "Maior alcance", "Mais curtidos"
  - [x] Renderizar colunas com thumbnail, legenda, data/hora, formato, views, alcance, likes, comentários, shares e engajamento

- [x] **Etapa 4: Reformulação da Página Principal (`src/pages/Metricas.tsx`)**
  - [x] Apagar o conteúdo anterior da página conforme solicitado
  - [x] Conectar ao `usePeriodFilter` para filtrar automaticamente os posts do mês selecionado no dashboard
  - [x] Adicionar cards de resumo geral no padrão Shadcn Dark Zinc (`KpiCard`) no topo
  - [x] Montar a seção dos Top 3 Destaques e a Tabela Analítica
  - [x] Adicionar botão de "Atualizar dados" (forçar refresh do cache) e estados elegantes de loading (Skeleton) e empty state

- [x] **Etapa 5: Testes Unitários e Validação Técnica**
  - [x] Criar teste unitário em `src/test/instagram.test.ts` cobrindo agregação de KPIs, filtros de data e ordenação
  - [x] Executar type-check (`npx tsc --noEmit`)
  - [x] Executar suíte de testes (`npm test`)
  - [x] Executar build de desenvolvimento (`npm run build:dev`)

- [x] **Etapa 6: Consolidação e Memória (`CONTEXT.md` e `logs/session_log.md`)**
  - [x] Atualizar `CONTEXT.md` com a nova arquitetura e endpoints
  - [x] Registrar a sessão em `logs/session_log.md`
