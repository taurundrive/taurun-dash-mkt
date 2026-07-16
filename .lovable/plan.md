## Reformulação da tela CAC

A tela vai passar a refletir exatamente os 6 indicadores da sua planilha, cada um com valor do mês selecionado, status colorido conforme benchmark e a explicação curta. Abaixo, uma tabela histórica mês a mês com todos eles.

### 1. Banco de dados

Adicionar 2 colunas em `cac_monthly`:
- `paid_revenue` (numeric) — Faturamento em vendas vindo do tráfego pago (ex: R$ 181.618,43 em abril)
- `general_avg_ticket` (numeric) — Ticket médio de vendas gerais (ex: R$ 23.159,00 em abril)

Os outros dois números da sua planilha já existem ou são derivados:
- "Investimento em tráfego pago" → já calculado de `campaigns_daily` (OUTCOME_ENGAGEMENT)
- "Clientes totais do tráfego pago" → já temos como `paid_leads`
- "Vendas do tráfego pago" → já temos como `closed_sales`
- "Faturamento total" → já temos em `sales_monthly.total_sales`
- "Ticket médio do tráfego pago" → calculado (paid_revenue / closed_sales)

### 2. Endpoint `ingest-cac` (n8n)

Atualizar o edge function para aceitar dois campos novos no payload, tolerando variações do nome do header da planilha:
- `faturamento_pago` / `Faturamento em vendas do tráfego pago` → `paid_revenue`
- `ticket_medio_geral` / `Ticket médio de vendas gerais` → `general_avg_ticket`

Os campos antigos continuam funcionando. Você só precisa adicionar essas duas colunas na planilha mensal e mandar no mesmo POST.

### 3. Nova tela CAC

**Topo da página:**
- Título "CAC & Performance Paga"
- Seletor de mês (usa o filtro global que já existe)

**Grade de 6 cards (3x2):**

Cada card mostra:
- Título do indicador (ex: "ROAS Pago")
- Valor grande formatado (10,7x  /  R$ 2.415  /  8,43%)
- Badge colorido com status: **Excelente** (verde) / **Bom** (azul) / **Alerta** (amarelo) / **Crítico** (vermelho), conforme as regras da sua planilha
- Linha curta de explicação ("Receita ÷ Investimento")
- Mini-rodapé com o benchmark ("Bom: 6x–10x · Excelente: >10x")

Regras de classificação (extraídas da sua planilha):

```text
ROAS pago:           Excelente >10x  | Bom 6–10x  | Alerta <6x
Custo mídia/Receita: Excelente <10%  | Bom 10–15% | Alerta 15–20% | Crítico >20%
CAC pago:            Comparado a 5–8% do ticket médio pago
Conversão lead→venda:Excelente >8%   | Bom 4–8%   | Alerta <4%
CPL pago:            Bom R$80–R$250  | Alerta fora dessa faixa
Ticket médio pago:   Excelente ≥ ticket geral +10% | Bom ≈ ticket geral | Alerta < ticket geral
```

**Tabela histórica (abaixo dos cards):**

Colunas: Mês · Investimento · Leads pagos · Vendas · Receita paga · ROAS · CAC · Conv. · CPL · Ticket pago

Cada célula numérica recebe a cor do status do mês. Linhas sem dados suficientes mostram "—" (evita #DIV/0).

### 4. Componentes removidos

A pedido seu, removo da página atual:
- O `CacScoreGauge` (gauge único de CAC) — substituído pelos 6 cards
- O `CacEvolutionChart` (gráfico só de CAC) — a tabela histórica já cobre. Se quiser mantenho, é só falar.
- "Meta de CAC" fixa — agora a comparação é contra o ticket médio pago do mês, como a sua planilha define

### 5. Detalhes técnicos (para referência)

- `src/data/types.ts` → adicionar `paidRevenue` e `generalAvgTicket` em `MonthlyCacRow`
- `src/data/dataSource.ts` → mapear os 2 campos novos da `cac_monthly`
- `src/lib/aggregations.ts` → nova função `computePaidIndicators(row)` retornando os 6 valores + status (`excellent | good | warning | critical`) por indicador
- `src/pages/Cac.tsx` → reescrita: header + grade de 6 cards + tabela
- Novo componente `IndicatorCard.tsx` (valor + badge + benchmark)
- Migration adiciona as 2 colunas (default 0) — dados existentes ficam zerados até o próximo run do n8n com a planilha atualizada

### O que você vai precisar fazer no n8n depois

1. Adicionar duas colunas mensais na planilha do CAC: `Faturamento em vendas do tráfego pago` e `Ticket médio de vendas gerais`
2. Mapear as duas no body do HTTP Request:
   ```
   "faturamento_pago": {{$json['Faturamento em vendas do tráfego pago']}},
   "ticket_medio_geral": {{$json['Ticket médio de vendas gerais']}}
   ```
3. Rodar — abril já deve aparecer com os números reais que você populou (ROAS 10,7x, CAC R$ 2.415, etc.)

Posso seguir?