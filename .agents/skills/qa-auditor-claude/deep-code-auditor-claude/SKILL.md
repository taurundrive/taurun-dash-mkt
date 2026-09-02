---
name: deep-code-auditor
description: "Audita de forma profunda o backend de um projeto: rotas/endpoints, regras de negócio, validação estática de código (lint/type-check) e a suíte de testes existente, delegando pro Claude Code rodando no terminal local. Mais abrangente que o qa-auditor comum — não compara só spec.md com o código, ela roda comandos de verdade (build, lint, type-check, testes) e tenta bater nas rotas reais. Use quando o usuário pedir uma 'auditoria completa', 'revisão profunda de código', 'audita o backend e as rotas', ou quando o qa-auditor comum não for suficiente. NÃO cobre frontend — para isso, use a skill frontend-check."
---
# Instruções de Delegação para o Claude Code (Auditoria Profunda)

Você NÃO deve atuar como o Auditor. Seu papel é atuar como o Desenvolvedor que delega a auditoria para o agente Claude Code rodando no terminal local — que TEM acesso a bash e arquivos dentro da própria chamada `claude -p`, então pode de fato rodar comandos, não só ler código.

## ⚠️ REGRA ABSOLUTA — NUNCA fabrique o resultado da auditoria

Se o comando `claude -p` falhar por QUALQUER motivo — CLI não encontrado, não autenticado, timeout,
erro de qualquer tipo — ou se o próprio Claude Code, dentro da auditoria, não conseguir rodar
algum dos passos abaixo (comando de lint não existe no projeto, servidor não sobe, etc.), você
**PARA** e reporta isso ao usuário com clareza. Você NUNCA:

- Escreve `STATUS: APROVADO` fingindo que veio da auditoria real quando ela não rodou ou rodou
  incompleta.
- Assume que "o código parece certo" substitui a auditoria real.
- Trata um passo que falhou/não pôde ser executado como se tivesse passado — reporte-o como
  lacuna de cobertura, nunca como aprovado.

Uma auditoria incompleta não é uma auditoria aprovada. Se algo não pôde ser verificado, isso é
parte do resultado, não um detalhe a esconder.

## Fluxo de Auditoria Autônoma

1. Use sua ferramenta de terminal (`run_command`) para executar o Claude Code passando a
   instrução de auditoria via prompt:

   **Comando a executar:**

   `claude -p "Você é um Engenheiro de QA Sênior fazendo uma auditoria profunda de backend. Siga este processo, na ordem, e reporte o que de fato conseguiu executar em cada passo: (1) Leia spec.md e plan.md se existirem no projeto; se não existirem, rode git diff e git log -10 para entender o que mudou recentemente. (2) Liste as rotas/endpoints de backend relevantes (nos handlers/controllers/routes) e, para cada uma, confira se a implementação bate com as regras de negócio esperadas (do spec.md/plan.md ou do comportamento documentado no código/testes). (3) Rode a validação estática disponível no projeto: type-check (ex: tsc --noEmit ou equivalente), lint (ex: npm run lint), e a suíte de testes existente (ex: npm test) — reporte os resultados REAIS desses comandos. Se algum comando não existir no projeto ou falhar por motivo de ambiente, diga isso explicitamente, não pule em silêncio. (4) Se um servidor local puder ser subido, suba-o e teste as rotas principais com requisições reais (curl ou similar), conferindo status code e formato de resposta. Se não for possível subir o servidor, reporte isso como lacuna de cobertura. (5) Classifique cada problema encontrado como P0/P1 (bloqueador), P2/P3 (débito técnico) ou P4 (sugestão), citando arquivo e trecho. Ao final, liste um resumo de quais dos passos 1-4 você de fato conseguiu executar e quais ficaram como lacuna. Se nenhum problema real for encontrado E todos os passos executáveis tiverem rodado, responda ESTRITAMENTE com 'STATUS: APROVADO' seguido do resumo de cobertura."`

2. Aguarde a execução do comando e leia a saída (output) que o Claude retornar.
3. Se o Claude encontrar problemas (falta de `STATUS: APROVADO`), você deve agir como o
   Desenvolvedor: corrija os problemas no código imediatamente.
4. Se a saída indicar lacunas de cobertura (passo que não pôde ser executado por motivo de
   ambiente — ex: falta uma dependência, servidor não sobe), resolva o que for razoável
   resolver (ex: instalar a dependência que falta) e então rode de novo. Se a lacuna for algo
   que só o usuário pode decidir (ex: o projeto não tem suíte de testes nenhuma), reporte isso
   ao usuário como uma lacuna permanente de cobertura, não tente mascarar.
5. Após corrigir, rode o comando do Claude novamente.
6. Repita esse loop autônomo (codar → rodar claude → codar) até que o Claude retorne
   `STATUS: APROVADO` com o resumo de cobertura mais completo possível.
7. Avise o usuário que a auditoria terminou, incluindo: quantos problemas reais foram
   encontrados e corrigidos por severidade, e quais passos ficaram como lacuna de cobertura
   (se houver) — não esconda isso, é informação relevante mesmo numa auditoria "aprovada".

## Quando NÃO usar esta skill

- Para checar se o frontend está funcionando de verdade (renderização, interação visual) — use
  a skill `frontend-check`, que é especializada nisso e tem seu próprio relatório objetivo.
- Para julgar relatórios de stress-test de outra skill (transcripts de persona, cenários de
  regra de negócio) — isso é o Modo Stress-Test da skill `qa-auditor`.
- Para uma auditoria rápida de spec.md/plan.md sem rodar comandos — o Modo Padrão da skill
  `qa-auditor` já cobre isso de forma mais leve.
