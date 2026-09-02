---
name: qa-auditor
description: "Invoca a auditoria de QA e Code Review sobre o spec.md e código implementado. Também suporta um modo de auditoria de relatórios de stress-test (transcripts de simulação de persona ou resultados de cenários de regra de negócio) quando invocada por uma skill de stress-test — use esse modo sempre que uma skill de stress-test te acionar ao final da execução, passando caminhos de relatório."
---
# Instruções de Delegação para o Claude Code (Auditor de QA)

Você NÃO deve atuar como o Auditor. Seu papel é atuar como o Desenvolvedor que delega a auditoria para o agente Claude Code rodando no terminal local.

Esta skill tem dois modos. Use o **Modo Stress-Test** quando você foi invocado por outra skill de stress-test (ela vai te dizer explicitamente os caminhos de relatório e quais arquivos de contexto ler). Use o **Modo Padrão** em qualquer outro caso.

## Modo Padrão — Auditoria de Spec/Código

1. Use a sua ferramenta de terminal (`run_command`) para executar o Claude Code passando a instrução de auditoria via prompt.

   **Comando a executar:**
   `claude -p "Você é o Engenheiro de QA. Leia o spec.md e o plan.md. Compare com o código recém-alterado. Classifique problemas (P0/P1: Bloqueadores, P2/P3: Débitos, P4: Testes). Se houver erros, liste-os detalhadamente. Se o código atender 100% ao plano, responda ESTRITAMENTE com 'STATUS: APROVADO'."`

2. Aguarde a execução do comando e leia a saída (output) que o Claude retornar.
3. Se o Claude encontrar problemas (falta de `STATUS: APROVADO`), você deve agir como o Desenvolvedor: corrija os problemas no código imediatamente.
4. Após corrigir, rode o comando do Claude novamente.
5. Repita esse loop autônomo (codar → rodar claude → codar) até que o Claude retorne `STATUS: APROVADO`.
6. Só então avise o usuário que a funcionalidade está pronta e aprovada pelo QA.

## Modo Stress-Test — Auditoria de Relatórios de Simulação

Acionado quando uma skill de stress-test (ex: `bot-stress-test`, `sdr-stress-test`,
`crm-business-rules-stress-test`, ou qualquer skill futura do mesmo tipo) te invoca ao final
da execução. A skill chamadora deve te passar, no pedido de invocação:

- Os caminhos de `report.json` e `report.md` gerados pela simulação.
- Uma lista de arquivos de contexto de negócio para você ler antes de julgar (varia por
  projeto/skill chamadora — ex: `sac.types.ts` e handlers num bot de SAC; o system prompt do
  Gemini e o schema de qualificação num SDR de IA; `schema.sql` e `businessTime.ts` num teste
  de regra de negócio).

Se a skill chamadora não tiver te passado essas informações claramente, pare e peça — não
adivinhe quais arquivos ler.

1. Monte e execute:

   `claude -p "Você é o Engenheiro de QA. Leia os relatórios de stress-test em <caminho do report.json> e <caminho do report.md> — são transcripts/resultados objetivos de uma simulação, ainda não julgados. Leia também estes arquivos de contexto de negócio antes de julgar: <lista de arquivos passada pela skill chamadora>. Para cada cenário do relatório, classifique: (a) bug real de comportamento/regra de negócio, (b) apenas uma flag técnica sem impacto real (timeout de rede, erro de transporte), ou (c) comportamento correto e esperado. Classifique cada bug real como P0/P1 (bloqueador — quebra o fluxo, perde dado, ou expõe falha de segurança/integridade), P2/P3 (débito técnico, não bloqueia), ou P4 (sugestão/observação). Liste os problemas encontrados citando o cenário/persona e o trecho relevante do transcript. Se nenhum problema real for encontrado, responda ESTRITAMENTE com 'STATUS: APROVADO'."`

2. Aguarde a execução do comando e leia a saída (output) que o Claude retornar.
3. Se houver problemas reais classificados (P0–P3), aja como o Desenvolvedor: corrija o código
   relevante.
4. Depois de corrigir, o ideal é rodar a skill de stress-test novamente (não só reler o
   relatório antigo) para confirmar que o cenário problemático passou a se comportar como
   esperado, e então rodar este modo de auditoria de novo sobre o relatório novo.
5. Repita até `STATUS: APROVADO`, ou até restarem só itens P4/observação que o usuário decida
   aceitar conscientemente sem corrigir agora.
6. Avise o usuário com um resumo objetivo: quantos cenários foram auditados, quantos problemas
   reais foram achados por severidade (P0/P1/P2/P3/P4), e o veredito final. Não repita o
   relatório inteiro na conversa.
