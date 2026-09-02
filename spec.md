# Especificação Técnica: Painel de Publicações e Performance do Instagram (`/metricas`)

## 1. Visão Geral e Objetivo
Substituir integralmente o conteúdo atual da aba **Métricas (`/metricas`)** por um painel analítico de publicações do Instagram da **[@tauruncompany](https://www.instagram.com/tauruncompany)** integrado à Meta Graph API v20.0:
- **Resumo Geral no Topo:** Cards de KPI no estilo canônico do Shadcn Dark Zinc apresentando as métricas consolidadas do mês (Seguidores Atuais, Total de Visualizações de Vídeo, Alcance Total, Interações Totais e Total de Publicações).
- **Top 3 Publicações em Destaque:** Grid visual com os 3 posts/reels de maior audiência do período (com thumbnail, badge de ranking #1, #2, #3, métricas em destaque e link direto para o Instagram).
- **Tabela Analítica Completa (Shadcn Table):** Listagem detalhada de todas as publicações do período com ordenação customizável (padrão: do mais visualizado para o menos visualizado), miniaturas, badges de formato (Reels, Carrossel, Foto), likes, comentários, shares, saves, alcance e taxa de engajamento.
- **Sincronização com o Filtro de Período:** Conectado ao seletor de mês global do dashboard (`usePeriodFilter`), filtrando as publicações postadas no mês selecionado.
- **Proteção de Cota da Meta API (Cache):** Cache em memória e `sessionStorage` com TTL de 15 minutos e botão de refresh sob demanda.

---

## 2. Arquitetura de Integração & Meta Graph API

### 2.1. Credenciais e Permissões
- **Origem:** `VITE_META_ACCESS_TOKEN` já configurado em `.env`.
- **Conta de Instagram Business:** `@tauruncompany` (ID: `17841403314058412`, 69.037 seguidores).
- **Escopos Ativos:** `instagram_basic`, `instagram_manage_insights`, `instagram_manage_comments`.

### 2.2. Endpoints Utilizados
1. **Perfil & Contagem Geral:**
   - `GET /v20.0/17841403314058412?fields=id,username,followers_count,media_count`
2. **Lista de Mídias:**
   - `GET /v20.0/17841403314058412/media?fields=id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=50`
3. **Métricas Detalhadas (Insights por Mídia):**
   - **Para REELS:** `GET /v20.0/{media-id}/insights?metric=reach,saved,shares,views,total_interactions`
   - **Para FEED / CARROSSEL:** `GET /v20.0/{media-id}/insights?metric=reach,saved,shares,total_interactions`

### 2.3. Estratégia de Cache e Proteção de Rate Limit
- **Multi-tiered Cache:**
  - Chave de cache: `ig_posts_${yearMonth}` (ex: `ig_posts_2026-09`).
  - TTL: **15 minutos**.
  - O carregamento da página verifica primeiro o cache local em memória / sessionStorage; se válido, renderiza instantaneamente em **0ms** sem fazer nenhuma chamada à Meta API.
  - Botão **"Sincronizar agora"** disponível no cabeçalho para permitir atualização forçada a qualquer momento.

---

## 3. Contrato de Dados (Preview Contract)

```typescript
export type InstagramMediaType = "REELS" | "CAROUSEL" | "IMAGE";

export interface InstagramPost {
  id: string;
  caption: string;
  mediaType: InstagramMediaType;
  mediaProductType: string;
  permalink: string;
  thumbnailUrl: string;
  mediaUrl: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  views: number; // Para Reels (views/plays), 0 para fotos estáticas
  totalInteractions: number;
  engagementRate: number; // (totalInteractions / reach) * 100
  isCollab: boolean;
  collaborators: string[]; // usernames dos parceiros (@)
}

export interface InstagramPeriodSummary {
  followersCount: number;
  totalPosts: number;
  totalCollabs: number;
  totalViews: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
}
```

---

## 4. Estrutura da Interface & Componentes

### 4.1. Cabeçalho da Página
- Título: *"Publicações & Performance do Instagram — {Mês/Ano}"*
- Rótulo descritivo: *"Engajamento orgânico, alcance e ranking dos posts da @tauruncompany"*
- Botão *"Atualizar dados"* (com ícone `RefreshCw` e feedback visual de sincronização).

### 4.2. Seção de Resumo Geral (Cards de KPI Shadcn)
- **Seguidores:** `69.037` (hint: *"Perfil oficial @tauruncompany"*).
- **Visualizações de Vídeo:** Soma de views dos Reels do mês (hint: *"Reproduções totais"*).
- **Alcance Único:** Soma de alcance dos posts publicados no período (hint: *"Contas alcançadas"*).
- **Total de Interações:** Curtidas + comentários + compartilhamentos + salvamentos.
- **Taxa Média de Engajamento:** `%` médio de interações sobre alcance.

### 4.3. Seção Top 3 Destaques (Cards Visuais)
- Grid de 3 colunas responsivo (`grid-cols-1 md:grid-cols-3 gap-4`).
- Cada card exibe:
  - Miniatura do post com proporção ajustada e overlay suave.
  - Badge de Ranking no topo: `#1 Mais Visto`, `#2 Destaque`, `#3 Destaque`.
  - Badge de Formato: `Reels` (com ícone de vídeo), `Carrossel` ou `Foto`.
  - Número grande de Visualizações ou Alcance.
  - Métricas rápidas: Likes ❤️, Comentários 💬, Compartilhamentos ↗️.
  - Trecho da legenda.
  - Botão sutil para abrir o post diretamente no Instagram (`ExternalLink`).

### 4.4. Seção Tabela Analítica de Publicações (Shadcn Table)
- Container: Card sólido Shadcn (`bg-card border border-border rounded-xl p-6 shadow-sm`).
- Cabeçalho com:
  - Título: *"Todas as publicações do período"* + badge com a quantidade de posts.
  - Seletor de Ordenação `<Select>`:
    - `Mais visualizados` (Padrão)
    - `Mais recentes`
    - `Maior alcance`
    - `Mais curtidos`
- Tabela com colunas:
  1. **Mídia / Capa:** Thumbnail quadrada arredondada com badge do formato (`Reels`, `Carrossel`, `Foto`).
  2. **Legenda:** Resumo do texto com link para o post oficial.
  3. **Publicação:** Data e horário formatados (ex: `02/09 às 12:02`).
  4. **Visualizações (Views):** Destaque em branco de alto contraste para Reels (`—` para fotos).
  5. **Alcance (Reach):** Contas alcançadas em `tabular-nums`.
  6. **Curtidas:** Número em `tabular-nums`.
  7. **Comentários:** Número em `tabular-nums`.
  8. **Shares / Saves:** Compartilhamentos e salvamentos.
  9. **Engajamento (%):** Badge em cinza sutil Shadcn.
  10. **Ação:** Ícone de abrir link externo no Instagram.

---

## 5. Casos de Borda & Tratamento de Erros
1. **Mês sem publicações:** Exibir estado vazio estilizado no padrão Shadcn indicando que não houve publicações no mês selecionado, com sugestão para selecionar outro mês no filtro superior.
2. **Imagens/Vídeos com URL expirada da CDN do Facebook:** Utilizar fallback gracioso com ícone de mídia e título caso a URL da imagem não carregue.
3. **Métricas indisponíveis em posts muito recentes:** Exibir `0` ou `—` sem quebrar o layout caso o endpoint de insights ainda não tenha processado dados para publicações recém-feitas.
