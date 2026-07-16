---
description: O design system que o sistema deve seguir
---

# 🖤 DESIGN SYSTEM OFICIAL: MODE — UI Kit (Black v.1.0.1) & TAURUN CCO

Ao desenvolver, refatorar ou sugerir qualquer componente visual neste projeto, você DEVE seguir estritamente as especificações abaixo. A estética do sistema baseia-se em **superfícies Preto Obsidiana (#000000)**, **contornos capilares translúcidos (hairline 1px)**, **sombras difusas profundas** e **micro-interações físicas de latência zero** (`/apple-design` & `emil-design-eng`).

---

## 1. CORES & SUPERFÍCIES (PALETA OBSIDIANA)

A aplicação nunca deve ter fundos brancos ou cinzas de grande escala. O fundo raiz da página deve ser **sempre preto puro (`#000000`)**.

### Configuração CSS / Tailwind CSS (`@theme` no `index.css` ou variáveis CSS):
```css
@theme {
  /* Fundo e Superfícies */
  --color-bg-primary: #000000;         /* Fundo raiz da aplicação (Obsidiana Puro) */
  --color-bg-card: #0a0a0d;            /* Cartões, containers principais e modais */
  --color-bg-elevated: #131318;        /* Popovers, menus dropdown e tooltips */
  --color-bg-hover: #18181f;           /* Estado hover em linhas de tabela ou itens */
  --color-bg-input: #101014;           /* Campos de busca, inputs e selects */

  /* Contornos Capilares (Bordas translúcidas de alta precisão) */
  --color-border-subtle: rgba(255, 255, 255, 0.06);  /* Borda padrão de cartões e divisórias */
  --color-border-strong: rgba(255, 255, 255, 0.12);  /* Borda ao passar o mouse (Hover) */
  --color-border-focus: rgba(255, 255, 255, 0.25);   /* Borda em elementos ativos ou focados */

  /* Tipografia & Tons Neutros */
  --color-text-primary: #ffffff;       /* Títulos, números principais e chamadas de ação */
  --color-text-secondary: #a1a1aa;     /* Subtítulos, descrições e valores secundários (Zinc 400) */
  --color-text-muted: #71717a;         /* Legendas, rótulos uppercase e ícones inativos (Zinc 500) */
}


Nunca utilize cores sólidas berrantes. Use caixas com fundo em 10% de opacidade e bordas capilares de 25%:

Sucesso / Ativo / Concluído: bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-xs
Alerta / Pendente / Atenção: bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono text-xs
Erro / Atrasado / Crítico: bg-red-500/10 text-red-400 border border-red-500/25 font-mono text-xs
Informativo / Agendado: bg-blue-500/10 text-blue-400 border border-blue-500/25 font-mono text-xs
Inativo / Neutro: bg-zinc-900 text-zinc-400 border border-white/[0.08] font-mono text-xs

2. TIPOGRAFIA & ESCALAS ÓTICAS
As fontes oficiais são importadas via Google Fonts no topo do CSS: @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

font-sans (Plus Jakarta Sans): Usada no corpo de texto, botões, títulos (h1, h2, h3) e números de métricas principais (tabular-nums).
font-mono (JetBrains Mono): Usada exclusivamente para rótulos superiores/eyebrows, códigos de identificação (OS-001), datas (15/07/2026) e badges de contagem.

Escala e Rótulos:
Título da Página (h1): text-xl sm:text-2xl font-extrabold font-sans text-white tracking-tight
Números Grandes em KPIs: text-2xl sm:text-3xl font-extrabold tabular-nums tracking-[-0.03em] font-sans text-white
Rótulos / Eyebrows: text-[11px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-500

3. SOMBRAS, VIDRO & ELEVAÇÃO (GLASSMORPHISM)
Os elementos flutuam sobre o fundo preto puro usando sombras difusas multicamadas e brilho interno (simulando luz de topo no vidro escuro):

Tokens de Sombra (index.css):
@theme {
  --shadow-card: 0 8px 30px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --shadow-dropdown: 0 24px 64px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

Acabamento de Cartão (Card Padrão):
Todo card principal deve usar a combinação de classes: bg-[#0a0a0d]/90 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl

4. ANATOMIA DE COMPONENTES INTERATIVOS
A. Ícones de Destaque Sóbrios (Dentro de Cartões):
<div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 text-zinc-300 transition-colors group-hover:text-white group-hover:border-white/25">
  <IconComponent size={17} className="stroke-[1.8]" />
</div>

B. Linha de Tabela / Lista Clicável:
<div className="px-5 py-4 hover:bg-white/[0.035] transition-colors cursor-pointer group flex items-center justify-between gap-4 border-b border-white/[0.04] last:border-b-0">
  <div className="flex items-center gap-3.5 min-w-0">
    {/* Linha vertical indicadora do status */}
    <div className="w-1.5 h-10 rounded-full shrink-0 transition-transform group-hover:scale-y-110 bg-emerald-500" />
    <div className="min-w-0">
      <span className="text-xs font-mono text-zinc-300 font-bold">#ID-0892</span>
      <p className="text-sm font-bold text-white truncate mt-0.5 group-hover:text-zinc-200 transition-colors font-sans">
        Título ou Nome do Item
      </p>
    </div>
  </div>
</div>


C. Botões / Abas Selecionáveis (Pílulas no FiltersBar):
Container: flex items-center gap-1.5 bg-[#0a0a0d] p-1.5 rounded-2xl border border-white/[0.06]
Item Ativo: bg-white/[0.08] text-white font-bold border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]
Item Inativo: text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent font-medium

5. FÍSICA E MICRO-INTERAÇÕES (LATÊNCIA ZERO)
Efeito Físico de Toque (Active / whileTap): Todos os botões ou cartões clicáveis devem ter active:scale-95 cursor-pointer (se em HTML puro) ou whileTap={{ scale: 0.985 }} (se em Framer Motion).
Reação ao Hover em Cartões: Cartões interativos em Framer Motion devem ter: whileHover={{ y: -3, borderColor: 'rgba(255,255,255,0.2)' }} e transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}.
Sem Atrasos Visualmente Perceptíveis: As transições de cor ou hover devem usar duration-150 ease-out ou duration-200.