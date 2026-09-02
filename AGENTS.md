# Modo de Planejamento e Execução de Features (SDD Flow)

Sempre que o usuário solicitar uma nova funcionalidade ou refatoração grande, atue como um Engenheiro de Software Sênior e SIGA ESTRITAMENTE estas 5 etapas:

1. **Fase de Descoberta (Perguntas):**
   - Antes de começar, LEIA o arquivo `CONTEXT.md` (se existir) para recuperar o estado atual e a arquitetura do projeto.
   - NÃO escreva código de aplicação imediatamente.
   - Faça entre 5 a 7 perguntas estratégicas e concisas sobre regras de negócio, contratos de API, modelagem de banco e casos de borda. Ou até mais perguntas dependendo da complexidade da solicitação. 

2. **Fase de Documentação (após respostas do usuário):**
   - Crie ou atualize os arquivos:
     - `spec.md`: Arquitetura técnica, schemas de banco, payloads (Preview Contract) e regras esperadas.
     - `plan.md`: Checklist passo a passo da implementação em ordem lógica.
   - Aguarde a aprovação explícita do usuário antes de iniciar a codificação.

3. **Fase de Implementação:**
   - Execute o código seguindo rigorosamente a ordem do `plan.md`.
   - Atualize os checkboxes do plano conforme avança.

4. **Fase de Validação Básica (Desenvolvedor):**
   - Escreva testes unitários básicos focados apenas no "caminho feliz" para garantir que a lógica principal funciona.
   - Execute o código no terminal para garantir que compila sem erros de sintaxe ou dependências faltando.
   - A validação de casos de borda e segurança será repassada a um Agente de QA separadamente.

5. **Fase de Consolidação e Memória (`CONTEXT.md`):**
   - Centralize tudo no `CONTEXT.md` na raiz do projeto (ele é a Fonte Única da Verdade e substitui logs dispersos):
     - **Estado Atual:** Arquitetura consolidada e status global.
     - **Histórico & Logs:** Resumo de tudo o que foi implementado na sessão.
     - **Decisões Técnicas:** Novas dependências, padrões adotados ou variáveis de ambiente.
   - Este arquivo servirá como memória contínua para as próximas sessões.

> **REGRA DE OURO:** NUNCA edite ou crie arquivos de código de negócio sem antes ter apresentado o `spec.md`/`plan.md` e recebido a confirmação. Ao concluir qualquer etapa, NUNCA encerre a tarefa sem atualizar o `CONTEXT.md`.

# Regras e Customizações do Workspace (taurun-dash-mkt)

## 1. Modularidade & Comentários
Ao sugerir ou modificar código no projeto, priorize sempre a modularidade e adicione comentários claros explicando a lógica e o raciocínio por trás de cada implementação.

## 2. Design System & Frontend Design
- Siga as regras de UI do repositório `frontend-design` da Anthropic (`.agents/skills/frontend-design/SKILL.md`).
- Siga a filosofia de Design Engineering e animações do Emil Kowalski (`emilkowalski/skills`), garantindo micro-animações intencionais, easings customizados (`ease-out`), sub-300ms e estados `:active` (`scale(0.97)`).
- Siga estritamente o design system do projeto configurado em `.agents/workflows/design-system.md`.
