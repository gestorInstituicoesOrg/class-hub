# Class Hub — Especificação de Migração e Arquitetura

## 1. Visão Geral e Estado Atual
O **Class Hub** é a evolução de um app simples de chamada *single-tenant* para uma **plataforma multi-tenant de gestão de instituições e turmas** (academias, escolas, clubes e modelos genéricos).
- **Banco de dados já aplicado:** O reset limpo e o schema v2 já foram executados no Supabase e documentados em `DATABASE.md`. Trate o `DATABASE.md` como fonte da verdade para tabelas, colunas, RLS, triggers, view e RPCs — **não reescreva nem altere o SQL** a menos que seja estritamente necessário para corrigir um bug.
- **Identidade única, múltiplos papéis:** Um usuário (`profiles` ligado a `auth.users` via trigger) usa uma única conta e pode atuar como:
  - `owner` ou `admin` de uma ou mais instituições (`organizations`) — *nesta fase inicial, `admin` tem permissões equivalentes a `owner`*;
  - `teacher` em uma ou mais turmas (`classes`) — *uma turma pode ter vários professores e a instituição pode ter vários professores em turmas diferentes*;
  - `student` em turmas específicas.
- **Onboarding:** Na entrada/cadastro, oferecer atalho de UX para direcionar quem quer gerir instituição vs. quem quer participar de turmas, sem travar a conta a apenas um papel.

## 2. Regras de Negócio Obrigatórias
1. **Sem `DELETE` para usuários:** Nunca usar `DELETE` em dados operacionais/usuários. Usar arquivamento via `archived_at`, preservando histórico e impedindo novos lançamentos/matrículas em itens arquivados.
2. **Aluno mínimo + *Claim* via convite:**
   - O cadastro de aluno na instituição (`organization_students`) exige apenas `full_name` (`user_id`, `email`, `avatar_url`, `phone` e `emergency_contact` são opcionais/`NULL` inicialmente).
   - `owner`/`admin` da instituição e **professores vinculados à turma** podem gerar/enviar convites (`invitations`) apontando para `organization_student_id`.
   - Ao aceitar o convite com conta autenticada via RPC `accept_invitation`, o sistema vincula `user_id = auth.uid()` ao registro existente sem perder histórico de presenças, graduações ou notas.
3. **Instituição e Customização (White-Label em 2 níveis):**
   - `organizations`: `name`, `cnpj` (opcional), `email`, `phone`, `photo_url` (logo), paleta com `primary_color`, `secondary_color` e `accent_color` (com valores padrão caso não configuradas), `archived_at`.
   - `classes`: `organization_id`, `name`, `template_type` (`'muay_thai' | 'jiu_jitsu' | 'school' | 'generic'`), `banner_url`, `primary_color` opcional (se `NULL`, herda da instituição; fallback global se nada definido), `archived_at`.
   - **Tema dinâmico:** Injetar cor base via variáveis CSS e derivar variações no front-end (`color-mix()` / `oklch()`) para aplicar na interface com fallback padrão.
4. **Templates de Turma, `domain_data` e Graduações:**
   - **Catálogo fixo no código:** Faixas, graus/*stripes* e *prajiads* (com suas cores reais) ficam definidos como constante/catálogo no código do front-end (alteráveis apenas pelo dono do código), enquanto o banco armazena o resumo/estado atual em `class_enrollments.domain_data` (`jsonb`) e o **histórico de graduações** em `graduation_history`.
   - **Muay Thai (`muay_thai`):** *prajiad* atual + histórico de graduações + dados base e chamada.
   - **Jiu-Jitsu (`jiu_jitsu`):** faixa + graus/*stripes* + histórico de graduações + dados base e chamada.
   - **Escola (`school`):** dados base + chamada + avaliações e notas (`assessments` / `assessment_grades`), sem exigência de número de matrícula formal nesta fase.
   - **Genérico (`generic`):** dados base + chamada.
5. **Chamadas, Histórico e Relatórios:**
   - A RPC `create_attendance_session` cria a sessão e os registros de presença numa única transação.
   - Status de presença suportados: `present`, `absent`, `late` e `justified` (todos computados no histórico do aluno).
   - Sessões com `status = 'completed'` são **imutáveis** (garantido no banco por RLS/trigger).
   - Relatórios contam **apenas sessões concluídas** (`completed`) e calculam a taxa como `present / (present + absent)` usando `NULLIF(present + absent, 0)`.

## 3. Segurança (RLS) e Funções
- RLS habilitada em todas as tabelas com funções auxiliares `SECURITY DEFINER` (`SET search_path = public`).
- Alunos enxergam apenas os próprios dados de presença, graduação e notas.

## 4. Roadmap de Execução em Etapas (Pedir 1 por vez)
1. **[CONCLUÍDA] Etapa 1 — Banco & RLS:** Script SQL aplicado no Supabase e documentado em `DATABASE.md`.
2. **Etapa 2 — Fluxo Core:** Gestão de instituição (`owner`/`admin`), turmas, alocação de múltiplos professores, cadastro de alunos (mínimo + convite/claim via `accept_invitation`), catálogo fixo de graduações/histórico e chamadas (`draft` -> `completed` imutável via `create_attendance_session`).
3. **Etapa 3 — Módulo Escola & White-Label:** Avaliações/notas para `school` (`assessments` / `assessment_grades`) e aplicação dinâmica de cores/logo/banner por instituição e turma.

## 5. Instrução para o Copilot
Implemente **apenas a etapa solicitada** no turno, respeitando rigorosamente todas as regras acima e o `DATABASE.md`, sem usar `DELETE` em dados de usuários/turmas/chamadas e mantendo respostas concisas e focadas nos arquivos alterados.