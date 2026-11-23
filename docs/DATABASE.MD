# Class Hub — Documentação da Arquitetura do Banco de Dados

## 1. Visão Geral da Arquitetura
O banco do **Class Hub** é modelado em **PostgreSQL / Supabase** com arquitetura **multi-tenant** centrada em **instituições (`organizations`)** e **turmas (`classes`)**, em vez de posse isolada por `auth.uid()`.

### Regras globais de banco
- **Sem `DELETE` para usuários:** Não existem políticas de `DELETE` para usuários finais nas tabelas operacionais; inativações/remoções operacionais usam `archived_at` (`timestamptz`).
- **Segurança em nível de linha (RLS):** Habilitada em todas as 13 tabelas, com funções `SECURITY DEFINER` (`SET search_path = public`) para verificar papéis sem recursão entre políticas.
- **Identidade única, múltiplos papéis:** Uma conta em `auth.users` / `profiles` pode administrar instituições (`owner` / `admin`), lecionar em turmas (`teacher`) e participar como aluno (`student`).
- **Regra de conclusão de chamadas:** Sessões não podem transicionar para `status = 'completed'` enquanto houver algum registro com `status = 'absent'` naquela sessão.
- **Imutabilidade de chamadas concluídas:** Sessões com `status = 'completed'` e seus registros em `attendance_records` não podem ser alterados ou excluídos.
- **Relatórios de frequência:** Consideram apenas sessões com `status = 'completed'` e calculam a taxa como `present / (present + absent)` usando `NULLIF(..., 0)`.

---

## 2. Mapa de Relacionamentos (ER)

```text
auth.users (1) ──── (1) profiles
                          │
     ┌────────────────────┼────────────────────┬────────────────────┐
     ▼ (owner_id)         ▼ (user_id)          ▼ (teacher_id)       ▼ (created_by / invited_by / accepted_by / awarded_by)
organizations       organization_students  class_teachers       attendance_sessions / invitations / graduation_history
     │                    │                    │
     ├──► organization_members                 │
     │                    │                    │
     └──► classes ◄───────┴────────────────────┘
           │     (class_id)
           ├──► class_enrollments (student_id -> organization_students.id)
           │          │
           │          └──► graduation_history (enrollment_id)
           │
           ├──► attendance_sessions
           │          │
           │          └──► attendance_records (session_id, student_id -> organization_students.id)
           │
           ├──► assessments
           │          │
           │          └──► assessment_grades (assessment_id, student_id -> organization_students.id)
           │
           └──► invitations (organization_id, class_id?, organization_student_id?)
```

---

## 3. Tabelas, Colunas, Regras Próprias e Relacionamentos

### 3.1 `profiles`
Perfil público/aplicacional do usuário autenticado.

- **Relacionamentos:** `id` referencia `auth.users(id)` (`ON DELETE CASCADE`). Referenciado por `organizations`, `organization_members`, `organization_students`, `class_teachers`, `graduation_history`, `attendance_sessions` e `invitations`.

**Colunas:**
- `id` (`uuid`, PK, FK `auth.users.id`)
- `full_name` (`text`, `NOT NULL`)
- `avatar_url` (`text`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Criado automaticamente via trigger `on_auth_user_created` (`AFTER INSERT ON auth.users -> public.handle_new_user()`), usando `raw_user_meta_data->>'full_name'` ou o prefixo do e-mail como fallback.
- **RLS:** usuário lê (`SELECT`) e atualiza (`UPDATE`) apenas o próprio registro (`id = auth.uid()`).

---

### 3.2 `organizations`
Representa a instituição, empresa ou escola e sua identidade visual base.

- **Relacionamentos:** `owner_id` referencia `profiles(id)` (`NOT NULL`). Referenciada por `organization_members`, `organization_students`, `classes` e `invitations`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `owner_id` (`uuid`, `NOT NULL`, FK `profiles(id)`)
- `name` (`text`, `NOT NULL`)
- `cnpj` (`text`, nullable)
- `email` (`text`, nullable)
- `phone` (`text`, nullable)
- `photo_url` (`text`, nullable)
- `primary_color` (`text`, `NOT NULL`, default `'#2563eb'`)
- `secondary_color` (`text`, `NOT NULL`, default `'#0f172a'`)
- `accent_color` (`text`, `NOT NULL`, default `'#0ea5e9'`)
- `archived_at` (`timestamptz`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Trigger `trg_sync_org_owner_member` (`AFTER INSERT OR UPDATE OF owner_id, archived_at`) sincroniza automaticamente o `owner_id` em `organization_members` com `role = 'owner'`.
- **RLS:** `INSERT` por usuário autenticado onde `owner_id = auth.uid()`; `UPDATE` apenas por gestor (`public.is_org_manager(id, auth.uid())`); `SELECT` para gestores, alunos da instituição ou professores de turmas da instituição.

---

### 3.3 `organization_members`
Vínculo de membros administrativos (`owner` e `admin`) da instituição.

- **Relacionamentos:** `organization_id -> organizations(id)`; `user_id -> profiles(id)`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
- `user_id` (`uuid`, `NOT NULL`, FK `profiles(id)`)
- `role` (`text`, `NOT NULL`, check `role in ('owner', 'admin')`)
- `archived_at` (`timestamptz`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Constraint `uq_org_member`: `UNIQUE (organization_id, user_id)`.
- Nesta fase, `admin` tem permissões administrativas equivalentes ao `owner` via `is_org_manager`.
- **RLS:** leitura para o próprio `user_id` ou gestor da instituição; `INSERT`/`UPDATE` apenas por gestor.

---

### 3.4 `organization_students`
Cadastro do aluno no escopo da instituição, suportando cadastro mínimo (`full_name`), alunos sem conta (`user_id IS NULL`), alunos avulsos em chamadas (sem `class_enrollments`) e claim posterior via convite.

- **Relacionamentos:** `organization_id -> organizations(id)`; `user_id -> profiles(id)` (nullable). Referenciada por `class_enrollments`, `attendance_records`, `assessment_grades` e `invitations`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
- `user_id` (`uuid`, nullable, FK `profiles(id)`)
- `full_name` (`text`, `NOT NULL`)
- `email` (`text`, nullable)
- `avatar_url` (`text`, nullable)
- `phone` (`text`, nullable)
- `emergency_contact` (`text`, nullable)
- `archived_at` (`timestamptz`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Constraint `uq_org_student_user`: `UNIQUE (organization_id, user_id)`.
- **RLS:** `SELECT` para o próprio aluno (`user_id = auth.uid()`), gestor da instituição ou professor de turma onde o aluno está matriculado; `INSERT`/`UPDATE` para gestor ou professor de turma da instituição.

---

### 3.5 `classes`
Turmas vinculadas a uma instituição, com tipo/template de modalidade e cor própria opcional.

- **Relacionamentos:** `organization_id -> organizations(id)`. Referenciada por `class_teachers`, `class_enrollments`, `attendance_sessions`, `assessments` e `invitations`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
- `name` (`text`, `NOT NULL`)
- `template_type` (`text`, `NOT NULL`, check `template_type in ('muay_thai', 'jiu_jitsu', 'school', 'generic')`)
- `banner_url` (`text`, nullable)
- `primary_color` (`text`, nullable — quando `NULL`, herda `primary_color` da instituição)
- `archived_at` (`timestamptz`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Apenas gestores da instituição (`is_org_manager`) podem criar (`INSERT`) ou atualizar (`UPDATE`) turmas; `SELECT` disponível para gestor, professor da turma e aluno matriculado na turma.

---

### 3.6 `class_teachers`
Alocação de professores às turmas (permite múltiplos professores por turma e múltiplos professores em turmas distintas).

- **Relacionamentos:** `class_id -> classes(id)`; `teacher_id -> profiles(id)`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
- `teacher_id` (`uuid`, `NOT NULL`, FK `profiles(id)`)
- `archived_at` (`timestamptz`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Constraint `uq_class_teacher`: `UNIQUE (class_id, teacher_id)`.
- **RLS:** `INSERT`/`UPDATE` apenas por gestor da instituição; `SELECT` para o próprio `teacher_id`, professores da turma ou gestor da instituição.

---

### 3.7 `class_enrollments`
Matrícula fixa de um aluno da instituição em uma turma específica, guardando dados atuais da modalidade em `domain_data`.

- **Relacionamentos:** `class_id -> classes(id)`; `student_id -> organization_students(id)`. Referenciada por `graduation_history`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
- `student_id` (`uuid`, `NOT NULL`, FK `organization_students(id)`)
- `domain_data` (`jsonb`, `NOT NULL`, default `'{}'::jsonb`)
- `enrolled_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `archived_at` (`timestamptz`, nullable)

**Regras próprias:**
- Constraint `uq_class_student_enrollment`: `UNIQUE (class_id, student_id)`.
- **RLS:** `SELECT` para professor da turma, gestor da instituição ou o próprio aluno (`organization_students.user_id = auth.uid()`); `INSERT`/`UPDATE` apenas para professor da turma ou gestor.

---

### 3.8 `graduation_history`
Histórico cronológico de graduações/faixas/graus/prajiads da matrícula.

- **Relacionamentos:** `enrollment_id -> class_enrollments(id)`; `awarded_by -> profiles(id)` (nullable).

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `enrollment_id` (`uuid`, `NOT NULL`, FK `class_enrollments(id)`)
- `rank_code` (`text`, `NOT NULL`)
- `rank_label` (`text`, `NOT NULL`)
- `stripes` (`integer`, nullable, check `stripes is null or stripes >= 0`)
- `color_hex` (`text`, nullable)
- `secondary_color_hex` (`text`, nullable)
- `awarded_by` (`uuid`, nullable, FK `profiles(id)`)
- `awarded_at` (`date`, `NOT NULL`, default `current_date`)
- `notes` (`text`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- **RLS:** `SELECT` para professor da turma, gestor da instituição ou o próprio aluno; `INSERT` para professor da turma ou gestor.

---

### 3.9 `attendance_sessions`
Sessões de chamada de uma turma, com ciclo `draft -> completed`.

- **Relacionamentos:** `class_id -> classes(id)`; `created_by -> profiles(id)`. Referenciada por `attendance_records`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
- `created_by` (`uuid`, `NOT NULL`, FK `profiles(id)`)
- `session_date` (`date`, `NOT NULL`, default `current_date`)
- `status` (`text`, `NOT NULL`, default `'draft'`, check `status in ('draft', 'completed')`)
- `notes` (`text`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `completed_at` (`timestamptz`, nullable)

**Regras próprias:**
- Constraint `chk_completed_timestamp`: exige `completed_at IS NULL` quando `status = 'draft'` e `completed_at IS NOT NULL` quando `status = 'completed'`.
- Trigger `trg_immutable_completed_session` (`BEFORE UPDATE -> enforce_completed_session_immutability()`):
  - Bloqueia qualquer `UPDATE` se `old.status = 'completed'`.
  - Quando `new.status = 'completed'`, verifica se existe algum registro em `attendance_records` com `status = 'absent'` para `new.id`; se houver, lança exceção e impede concluir a chamada.
  - Ao transicionar para `'completed'`, preenche `completed_at = now()` se estiver nulo.
- **RLS:** `SELECT` para professor da turma, gestor da instituição ou aluno matriculado; `UPDATE` apenas em `status = 'draft'` por professor da turma ou gestor.

---

### 3.10 `attendance_records`
Registro de presença por aluno dentro de uma sessão de chamada (suporta alunos matriculados na turma fixa e alunos avulsos da instituição lançados na sessão).

- **Relacionamentos:** `session_id -> attendance_sessions(id)`; `student_id -> organization_students(id)`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `session_id` (`uuid`, `NOT NULL`, FK `attendance_sessions(id)`)
- `student_id` (`uuid`, `NOT NULL`, FK `organization_students(id)`)
- `status` (`text`, `NOT NULL`, check `status in ('present', 'absent', 'late', 'justified')`)
- `observation` (`text`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Constraint `uq_session_student_record`: `UNIQUE (session_id, student_id)`.
- Trigger `trg_immutable_completed_records` (`BEFORE INSERT OR UPDATE OR DELETE`): impede qualquer alteração em `attendance_records` quando a sessão pai estiver com `status = 'completed'`.
- **RLS:** `SELECT` para professor da turma, gestor da instituição ou apenas o próprio aluno (`student_id` vinculado a `auth.uid()`); `INSERT`/`UPDATE` apenas com sessão em `'draft'` por professor ou gestor.

---

### 3.11 `assessments`
Avaliações/provas/trabalhos de uma turma (voltado ao template `school`).

- **Relacionamentos:** `class_id -> classes(id)`. Referenciada por `assessment_grades`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
- `title` (`text`, `NOT NULL`)
- `max_score` (`numeric(6,2)`, `NOT NULL`, default `10.00`, check `max_score > 0`)
- `weight` (`numeric(5,2)`, `NOT NULL`, default `1.00`, check `weight >= 0`)
- `assessment_date` (`date`, `NOT NULL`, default `current_date`)
- `archived_at` (`timestamptz`, nullable)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- **RLS:** `SELECT` para professor da turma, gestor da instituição ou aluno matriculado; `INSERT`/`UPDATE` para professor da turma ou gestor.

---

### 3.12 `assessment_grades`
Notas atribuídas aos alunos por avaliação.

- **Relacionamentos:** `assessment_id -> assessments(id)`; `student_id -> organization_students(id)`.

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `assessment_id` (`uuid`, `NOT NULL`, FK `assessments(id)`)
- `student_id` (`uuid`, `NOT NULL`, FK `organization_students(id)`)
- `score` (`numeric(6,2)`, `NOT NULL`, check `score >= 0`)
- `feedback` (`text`, nullable)
- `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- Constraint `uq_assessment_student_grade`: `UNIQUE (assessment_id, student_id)`.
- **RLS:** `SELECT` para professor da turma, gestor da instituição ou apenas o próprio aluno; `INSERT`/`UPDATE` para professor da turma ou gestor.

---

### 3.13 `invitations`
Convites para ingresso como `admin`, `teacher` ou `student` (incluindo claim de cadastro pré-existente em `organization_students`).

- **Relacionamentos:** `organization_id -> organizations(id)`; `class_id -> classes(id)` (nullable); `organization_student_id -> organization_students(id)` (nullable); `invited_by -> profiles(id)`; `accepted_by -> profiles(id)` (nullable).

**Colunas:**
- `id` (`uuid`, PK, default `gen_random_uuid()`)
- `token` (`text`, `NOT NULL`, `UNIQUE`, default `encode(gen_random_bytes(16), 'hex')`)
- `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
- `class_id` (`uuid`, nullable, FK `classes(id)`)
- `role` (`text`, `NOT NULL`, check `role in ('admin', 'teacher', 'student')`)
- `organization_student_id` (`uuid`, nullable, FK `organization_students(id)`)
- `invited_email` (`text`, nullable)
- `invited_by` (`uuid`, `NOT NULL`, FK `profiles(id)`)
- `expires_at` (`timestamptz`, `NOT NULL`, default `now() + interval '7 days'`)
- `accepted_at` (`timestamptz`, nullable)
- `accepted_by` (`uuid`, nullable, FK `profiles(id)`)
- `created_at` (`timestamptz`, `NOT NULL`, default `now()`)

**Regras próprias:**
- **RLS:** `SELECT` para quem convidou (`invited_by = auth.uid()`), quem aceitou (`accepted_by = auth.uid()`), gestor da instituição ou professor da turma (`class_id`); `INSERT` por gestor da instituição, ou por professor da turma quando `role = 'student'` e `class_id` informado.

---

## 4. Funções, RPCs e View

### Funções auxiliares de RLS (`SECURITY DEFINER`)
- `is_org_manager(p_org_id uuid, p_user_id uuid default auth.uid()) -> boolean`: verifica se `p_user_id` é `owner_id` ou membro ativo (`owner`/`admin`) de uma `organizations` não arquivada.
- `is_class_teacher(p_class_id uuid, p_user_id uuid default auth.uid()) -> boolean`: verifica se `p_user_id` é professor ativo (`class_teachers.archived_at IS NULL`) em uma turma não arquivada.
- `is_class_student(p_class_id uuid, p_user_id uuid default auth.uid()) -> boolean`: verifica se `p_user_id` está vinculado a um `organization_students` ativo matriculado em turma ativa.
- `is_org_student(p_org_id uuid, p_user_id uuid default auth.uid()) -> boolean`: verifica se `p_user_id` possui cadastro ativo em `organization_students` na instituição.

### RPCs transacionais
- `create_attendance_session(p_class_id uuid, p_session_date date default current_date, p_notes text default null, p_records jsonb default '[]'::jsonb) -> uuid`:
  - Valida usuário autenticado, turma ativa e permissão (`is_class_teacher` ou `is_org_manager`).
  - Cria a sessão em `'draft'` e insere os `attendance_records` na mesma transação.
  - Quando `p_records` vier vazio, insere `'present'` para todos os alunos ativos matriculados em `class_enrollments`.
  - Quando `p_records` for informado, valida cada `student_id` contra a mesma `organization_id` da turma (permitindo incluir alunos avulsos da instituição sem `class_enrollments` na sessão atual).

- `accept_invitation(p_token text) -> jsonb`:
  - Trava o convite (`FOR UPDATE`) exigindo `accepted_at IS NULL` e `expires_at > now()`.
  - Quando houver e-mail esperado (`invitations.invited_email` ou `organization_students.email`), exige que o e-mail da conta autenticada (`auth.jwt() ->> 'email'`) corresponda exatamente (normalizado em minúsculas e sem espaços).
  - Aplica o papel (`admin` em `organization_members`, `teacher` em `class_teachers`, ou `student` vinculando `user_id = auth.uid()` ao `organization_student_id` existente ou criando/reativando em `organization_students` e matriculando em `class_enrollments` quando `class_id` existir).
  - Marca `accepted_at = now()` e `accepted_by = auth.uid()`.

### View de relatório
- `attendance_summary_by_enrollment` (`security_invoker = true`):
  - Agrega por `enrollment_id`, `class_id` e `student_id` apenas sessões com `s.status = 'completed'`.
  - Calcula `present_count`, `absent_count`, `late_count`, `justified_count` e `attendance_rate` como `present_count::numeric / nullif(present_count + absent_count, 0)`.