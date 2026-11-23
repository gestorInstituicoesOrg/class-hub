# Class Hub — Especificação de Migração e Arquitetura

## 1. Visão Geral
O **Class Hub** é a evolução de um app simples de chamada *single-tenant* para uma **plataforma multi-tenant de gestão de instituições e turmas** (academias, escolas, clubes e modelos genéricos).
- **Estratégia de banco:** Reset limpo do schema atual do domínio de chamadas (há poucos registros de teste; pode recriar do zero com segurança)[cite: 1, 2].
- **Identidade única, múltiplos papéis:** Um usuário (`profiles` ligado a `auth.users` via trigger) usa uma única conta e pode atuar como:
  - `owner` ou `admin` de uma ou mais instituições (`organizations`) — *nesta fase inicial, `admin` tem permissões equivalentes a `owner`*;
  - `teacher` em uma ou mais turmas (`classes`) — *uma turma pode ter vários professores e a instituição pode ter vários professores em turmas diferentes*;
  - `student` em turmas específicas[cite: 1, 2].
- **Onboarding:** Na entrada/cadastro, oferecer atalho de UX para direcionar quem quer gerir instituição vs. quem quer participar de turmas, sem travar a conta a apenas um papel[cite: 1, 2].

## 2. Regras de Negócio Obrigatórias
1. **Sem `DELETE` para usuários:** Nunca usar `DELETE` em dados operacionais/usuários. Usar arquivamento via `archived_at` (ou status equivalente), preservando histórico e impedindo novos lançamentos/matrículas em itens arquivados[cite: 1, 2].
2. **Aluno mínimo + *Claim* via convite:**
   - O cadastro de aluno na instituição (`organization_students`) exige apenas `full_name` (`user_id`, `email`, `avatar_url`, `phone` e `emergency_contact` são opcionais/`NULL` inicialmente)[cite: 1, 2].
   - `owner`/`admin` da instituição e **professores vinculados à turma** podem gerar/enviar convites (`invitations`) apontando para `organization_student_id`[cite: 1, 2].
   - Ao aceitar o convite com conta autenticada (`accept_invitation`), o sistema vincula `user_id = auth.uid()` ao registro existente sem perder histórico de presenças, graduações ou notas[cite: 1, 2].
3. **Instituição e Customização (White-Label em 2 níveis):**
   - `organizations`: `name`, `cnpj` (opcional), `email`, `phone`, `photo_url` (logo), paleta de 2 a 3 cores (ex.: `primary_color`, `secondary_color`, `accent_color` com valores padrão caso não configuradas), `archived_at`[cite: 1, 2].
   - `classes`: `organization_id`, `name`, `template_type` (`'muay_thai' | 'jiu_jitsu' | 'school' | 'generic'`), `banner_url`, `primary_color` opcional (se `NULL`, herda da instituição; fallback global se nada definido), `archived_at`[cite: 1, 2].
   - **Tema dinâmico:** Injetar cor base via variáveis CSS e derivar variações no front-end (`color-mix()` / `oklch()`) para aplicar em toda a interface com fallback padrão[cite: 1, 2].
4. **Templates de Turma e Graduações:**
   - **Catálogo fixo no código:** Faixas, graus/*stripes* e *prajiads* (com suas cores reais) ficam definidos como constante/catálogo no código do front-end (alteráveis apenas pelo dono do código), enquanto o banco armazena o estado atual na matrícula e o **histórico de graduações** (`graduation_history`) do aluno[cite: 1, 2].
   - **Muay Thai (`muay_thai`):** *prajiad* atual + histórico de graduações + dados base e chamada[cite: 1, 2].
   - **Jiu-Jitsu (`jiu_jitsu`):** faixa + graus/*stripes* + histórico de graduações + dados base e chamada[cite: 1, 2].
   - **Escola (`school`):** dados base + chamada + avaliações e notas (`assessments` / `assessment_grades`), sem exigência de número de matrícula formal nesta fase[cite: 1, 2].
   - **Genérico (`generic`):** dados base + chamada[cite: 1, 2].
5. **Chamadas, Histórico e Relatórios:**
   - `create_attendance_session` cria a sessão e os registros de presença numa única transação[cite: 1, 2].
   - Status de presença suportados: `present`, `absent`, `late` e `justified` (presença, ausência, atraso e justificada computados no histórico do aluno)[cite: 1, 2].
   - Sessões com `status = 'completed'` são **imutáveis** (via RLS/trigger)[cite: 1, 2].
   - Relatórios contam **apenas sessões concluídas** (`completed`) e calculam a taxa como `present / (present + absent)` (usando `NULLIF(present + absent, 0)` para evitar divisão por zero)[cite: 1, 2].

## 3. Segurança (RLS) e Funções
- RLS habilitada em todas as tabelas[cite: 1, 2].
- Usar funções `SECURITY DEFINER` com `search_path = public` para checar papéis (`owner`/`admin` da instituição, `teacher` da turma, `student` da turma) evitando recursão em políticas RLS[cite: 1, 2].
- Alunos enxergam apenas os próprios dados de presença, graduação e notas[cite: 1, 2].

## 4. Roadmap de Execução em Etapas (Pedir 1 por vez)
1. **Etapa 1 — Banco & RLS:** Script SQL completo de recriação das tabelas, trigger de `profiles`, funções auxiliares, RLS, `create_attendance_session` e `accept_invitation`[cite: 1, 2].
2. **Etapa 2 — Fluxo Core:** Gestão de instituição (`owner`/`admin`), turmas, alocação de múltiplos professores, cadastro de alunos (mínimo + convite/claim), graduações/histórico e chamadas (`draft` -> `completed` imutável)[cite: 1, 2].
3. **Etapa 3 — Módulo Escola & White-Label:** Avaliações/notas para `school` e aplicação dinâmica de cores/logo/banner por instituição e turma[cite: 1, 2].

## 5. Instrução para o Copilot
Implemente **apenas a etapa solicitada** no turno, respeitando rigorosamente todas as regras acima, sem usar `DELETE` em dados de usuários/turmas/chamadas e mantendo respostas concisas e focadas nos arquivos alterados[cite: 1, 2].