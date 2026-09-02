---
name: frontend-check
description: "Verifica se o frontend de um projeto está funcionando de verdade. Detecta se já existe Playwright/Cypress configurado e roda a suíte real; se não existir, faz um build check + smoke test HTTP nas rotas principais e deixa CLARO no relatório que isso não é uma checagem visual/funcional completa. Ao final, aciona a skill qa-auditor pra julgar os resultados. Use quando o usuário pedir para 'checar se o front está funcionando', 'testar a UI', 'ver se a tela está ok', ou como parte de uma auditoria completa junto com a deep-code-auditor."
---

# Frontend Check

Diferente da `deep-code-auditor` (que fica no backend), esta skill verifica especificamente se
o frontend funciona — de verdade, quando possível, ou com o melhor esforço honesto quando não
há infraestrutura de teste de UI no projeto.

## Princípio: nunca reportar mais confiança do que o método usado sustenta

Esta skill tem dois métodos possíveis, e o relatório final sempre deixa explícito qual foi
usado:

- **Método real (e2e)**: se o projeto já tem Playwright, Cypress, ou testes de componente
  configurados, ela roda a suíte de verdade e reporta os resultados reais.
- **Método best-effort (fallback)**: se não há nada disso, ela só confirma que o projeto builda
  sem erro e que as rotas principais respondem via HTTP (status code) — isso NÃO é uma
  verificação visual nem de interação real. O relatório marca isso explicitamente como
  `COVERAGE: BEST_EFFORT_ONLY`, não como uma checagem completa.

Nunca deixe o usuário (ou a qa-auditor) achar que o fallback é equivalente ao método real.

## Pré-requisitos

1. O projeto precisa ter um comando de build definido em `package.json` (ex: `npm run build`)
   e, idealmente, um comando de dev server.
2. Para o método real, o Playwright/Cypress já precisa estar configurado no projeto — esta
   skill não instala/configura um framework de teste do zero (se não existir, ela usa o
   fallback e pode sugerir ao usuário configurar Playwright como próximo passo).

## Passo 0 — Calibrar

Os scripts têm pontos `// AJUSTE` porque dependem de como cada projeto sobe seu dev server:

1. Leia `package.json` para confirmar os scripts disponíveis (`build`, `dev`, `test:e2e`, etc.)
   e ajuste `scripts/run-frontend-check.js` — especificamente `DEV_SERVER_COMMAND`,
   `DEV_SERVER_PORT`, e `ROUTES_TO_CHECK` (lista de rotas pra bater no smoke test, ex: `/`,
   `/login`, `/dashboard` — ajuste pras rotas reais do projeto).

## Passo 1 — Rodar a checagem

```bash
node scripts/run-frontend-check.js
```

O script:

1. Detecta se existe `playwright.config.*` ou `cypress.config.*` (ou pasta `cypress/`,
   `e2e/`) no projeto.
2. **Se encontrar**: roda a suíte (`npx playwright test` ou `npx cypress run`) e captura os
   resultados reais.
3. **Se não encontrar**: roda `npm run build`; se buildar sem erro, sobe o dev server
   temporariamente, espera ele responder, faz requisições HTTP nas rotas de `ROUTES_TO_CHECK` e
   registra os status codes; derruba o servidor no final.
4. Salva `.tmp/report.json` e `.tmp/report.md` com o método usado e os resultados — sempre com
   o campo `coverage` (`"real_e2e"` ou `"best_effort_only"`) bem visível.

## Passo 2 — Acionar a qa-auditor (obrigatório)

Aciona a skill `qa-auditor` (modo Stress-Test), passando:

- Caminhos: `.tmp/report.json` e `.tmp/report.md`.
- O enquadramento: são resultados de verificação de frontend. **Se `coverage` for
  `best_effort_only`, deixe isso claro pro usuário no resumo final** — não é uma auditoria de
  UI completa, é só build + smoke test HTTP. Nesse caso, sugira ao usuário configurar
  Playwright se quiser cobertura real no futuro (não faça isso automaticamente, é uma decisão
  do usuário).
- Se `coverage` for `real_e2e`, a qa-auditor deve classificar falhas de teste normalmente
  (P0/P1 se quebram fluxo crítico, etc.).

## Depois de rodar

Resuma pro usuário: qual método foi usado, quantas rotas/testes passaram, e se ficou alguma
lacuna de cobertura — sendo direto sobre isso, não otimista demais.
