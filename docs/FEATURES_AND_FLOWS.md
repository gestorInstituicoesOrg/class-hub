---

## `FEATURES_AND_FLOWS.md`

```markdown
# Class Hub — Funcionalidades e Fluxos do Sistema

Este documento descreve as funcionalidades, os papéis de uso e os fluxos operacionais do **Class Hub**. Para detalhes de tabelas, políticas de segurança e funções do banco, consulte [DATABASE.md](./DATABASE.md); para stack, estrutura de pastas e diretrizes de código, consulte [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Perfis e Contextos de Atuação

Uma mesma conta autenticada (`profiles` vinculada a `auth.users`) pode atuar em diferentes contextos sem necessidade de contas separadas:

- **Gestor (`owner` / `admin`) de Instituição (`organizations`):**
  - Cria e edita instituições (nome, CNPJ opcional, e-mail, telefone, foto/logo e paleta de cores com valores padrão).
  - Cria e configura turmas (`classes`) escolhendo o template (`muay_thai`, `jiu_jitsu`, `school`, `generic`), banner e cor opcional (herdando da instituição quando omitida).
  - Aloca um ou mais professores (`class_teachers`) nas turmas e gerencia membros administrativos (`organization_members`).
  - Nesta fase inicial, `admin` possui permissões administrativas equivalentes às de `owner`.
- **Professor (`teacher`) de Turma:**
  - Opera nas turmas às quais está vinculado (uma turma pode ter vários professores e a instituição pode ter vários professores em turmas diferentes).
  - Cadastra e gerencia alunos na instituição/turma, registra graduações e histórico (quando aplicável ao template), lança notas (em turmas `school`), abre/conclui chamadas e gera convites para alunos da turma.
  - Não cria nem arquiva turmas.
- **Aluno (`student`):**
  - Visualiza apenas os próprios dados: histórico de presença, graduações/histórico (quando aplicável) e notas (quando aplicável).
  - Pode pertencer a uma ou mais turmas e também gerir/criar instituições caso utilize a mesma conta para esse fim.

> **Sem exclusão física para usuários:** A interface não oferece exclusão definitiva de dados operacionais de usuários; remoções ou encerramentos usam arquivamento (`archived_at`) para preservar o histórico.

---

## 2. Fluxos Principais do Sistema

### 2.1 Cadastro, Login e Onboarding
1. **Usuário novo:** Cria conta com nome, e-mail e senha; o trigger cria o registro em `profiles`.
2. **Atalho de onboarding:** Na primeira entrada (ou quando ainda não possui instituições nem turmas), o sistema exibe um atalho simples para escolher entre **criar/gerir uma instituição** ou **acessar/entrar em turmas** — sem travar a conta a apenas um papel.
3. **Usuário já cadastrado:** Entra direto no sistema e, de dentro da aplicação, pode acessar suas turmas/instituições ou **criar uma nova instituição** a qualquer momento.

### 2.2 Cadastro de Alunos e Convite (*Claim* de Conta)
1. **Cadastro mínimo inicial:** O gestor ou professor pode cadastrar um aluno informando apenas o **nome (`full_name`)**. Campos como e-mail, foto, telefone, contato de emergência e vínculo de conta (`user_id`) são opcionais no momento do cadastro.
2. **Geração e envio de convite:** O gestor (`owner`/`admin`) ou um **professor da turma** pode gerar um convite para o aluno:
   - Disponibilizando **link/código copiável** e/ou **disparo de e-mail**.
   - O convite exige correspondência de **e-mail**: a conta autenticada que aceitar o convite só poderá concluir o *claim* via `accept_invitation` se o e-mail da conta for o mesmo que foi cadastrado/informado no convite.
3. **Vínculo com preservação de histórico:** Ao aceitar o convite com o e-mail correspondente, a conta (`auth.uid()`) é vinculada ao cadastro de aluno existente (`organization_students.user_id`), mantendo intactos todo o histórico de chamadas, graduações e notas anteriores.

### 2.3 Turmas, Templates e Graduações / Notas
Ao criar uma turma (`classes`), o gestor define o **template** que orienta os recursos específicos daquela turma:

- **`muay_thai`:**
  - Dados base do aluno + chamadas.
  - Controle do *prajiad* atual e registro de promoções em `graduation_history`, utilizando o catálogo fixo de *prajiads* e cores definido no código da aplicação (alterável apenas pelo desenvolvedor).
- **`jiu_jitsu`:**
  - Dados base do aluno + chamadas.
  - Controle de faixa e graus (*stripes*) atuais e registro de promoções em `graduation_history`, utilizando o catálogo fixo de faixas, graus e cores definido no código da aplicação.
- **`school`:**
  - Dados base do aluno + chamadas.
  - Gestão de avaliações (`assessments`) e notas (`assessment_grades`), sem exigência de número de matrícula escolar formal nesta fase.
- **`generic`:**
  - Dados base do aluno + chamadas, sem campos específicos adicionais de modalidade.

### 2.4 Chamadas (`draft` -> `completed`), Aluno Avulso e Relatórios
1. **Abertura da chamada:** O professor ou gestor abre uma sessão de chamada para a turma (permitindo múltiplas sessões no mesmo dia). A chamada inicia em rascunho (`draft`) com os alunos ativos matriculados na turma.
2. **Aluno avulso na chamada atual (exceção):** Caso um aluno não faça parte da turma fixa (por exemplo, participando de uma aula experimental ou avulsa), o sistema permite cadastrá-lo na instituição e incluí-lo **apenas na chamada atual** via `p_records` (ou registro na sessão em `draft`), sem matriculá-lo permanentemente na turma fixa (`class_enrollments`).
3. **Marcação de estados:** Cada registro suporta `present`, `absent`, `late` e `justified` (sempre acompanhados de rótulo/ícone além da cor, e todos computados no histórico do aluno).
4. **Regra de conclusão:** Tanto a interface quanto o banco **impedem concluir a chamada (`completed`) caso haja falta (`absent`) registrada em algum aluno** (exigindo revisão antes de finalizar).
5. **Imutabilidade:** Uma vez concluída (`status = 'completed'`), a sessão e seus registros tornam-se **imutáveis**.
6. **Relatórios:** Consideram **apenas sessões concluídas (`completed`)** e calculam a taxa de frequência como `present / (present + absent)` (evitando divisão por zero quando o denominador for `0`).

### 2.5 Customização Visual (White-Label em Dois Níveis)
1. O sistema mantém uma paleta padrão de fallback quando nenhuma cor é personalizada.
2. A **instituição** pode configurar sua identidade visual (logo/foto e cores da paleta).
3. A **turma** pode configurar banner e cor própria; quando não definida, **herda automaticamente** a cor da instituição (e, na ausência desta, o fallback padrão).
4. O front-end aplica os tokens via variáveis CSS e cores derivadas (`color-mix()` / `oklch()`) na interface, preservando contraste e acessibilidade.