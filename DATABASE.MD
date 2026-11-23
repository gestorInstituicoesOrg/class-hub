# Class Hub — Documentação da Arquitetura do Banco de Dados

## 1. Visão Geral da Arquitetura

O banco de dados do **Class Hub** foi modelado em **PostgreSQL / Supabase** utilizando uma arquitetura **multi-tenant** centrada nas entidades de **Instituição (`organizations`)** e **Turma (`classes`)**, substituindo a antiga posse isolada por usuário (`auth.uid()`).

### Regras Globais do Banco
- **Sem `DELETE` Destrutivo:** Não existem políticas nem comandos de `DELETE` para os usuários finais nas tabelas operacionais. A inativação e remoção lógica acontecem exclusivamente via `archived_at` (`timestamptz`).
- **Segurança em Nível de Linha (RLS):** Habilitada em todas as 13 tabelas da aplicação, utilizando funções auxiliares com `SECURITY DEFINER` e `SET search_path = public` para impedir recursão e garantir performance.
- **Identidade Única e Múltiplos Papéis:** Um único registro em `auth.users` / `profiles` pode atuar como `owner` ou `admin` de instituições, `teacher` em turmas e `student` em outras turmas.
- **Imutabilidade de Chamadas Concluídas:** Sessões de chamada com `status = 'completed'` e seus respectivos registros em `attendance_records` são imutáveis contra `UPDATE` ou remoção.
- **Relatórios de Frequência:** Consideram apenas sessões concluídas (`completed`) e calculam a taxa através da fórmula $\text{taxa} = \frac{\text{presentes}}{\text{presentes} + \text{ausentes}}$, tratando a divisão por zero com `NULLIF`.

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

## 3. Especificação das Tabelas

### 3.1 `profiles`
Armazena o perfil público/aplicacional do usuário autenticado no sistema.

* **Relacionamentos:**
  * `id` referencia `auth.users(id)` com `ON DELETE CASCADE`.
  * Referenciado por `organizations`, `organization_members`, `organization_students`, `class_teachers`, `graduation_history`, `attendance_sessions` e `invitations`.
* **Colunas:**
  * `id` (`uuid`, PK, FK `auth.users.id`)
  * `full_name` (`text`, `NOT NULL`)
  * `avatar_url` (`text`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Trigger:** Criado/sincronizado automaticamente via `on_auth_user_created` (`AFTER INSERT ON auth.users` que executa `public.handle_new_user()`), obtendo `full_name` dos metadados ou do prefixo do e-mail.
  * **RLS:** `SELECT` e `UPDATE` restritos ao próprio usuário (`id = auth.uid()`).

---

### 3.2 `organizations`
Representa a instituição, academia, escola ou empresa, mantendo suas informações institucionais e a paleta de cores base do tema *white-label*.

* **Relacionamentos:**
  * `owner_id` referencia `profiles(id)` (`NOT NULL`).
  * Referenciada por `organization_members`, `organization_students`, `classes` e `invitations`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `owner_id` (`uuid`, `NOT NULL`, FK `profiles(id)`)
  * `name` (`text`, `NOT NULL`)
  * `cnpj` (`text`, nullable)
  * `email` (`text`, nullable)
  * `phone` (`text`, nullable)
  * `photo_url` (`text`, nullable)
  * `primary_color` (`text`, `NOT NULL`, default `'#2563eb'`)
  * `secondary_color` (`text`, `NOT NULL`, default `'#0f172a'`)
  * `accent_color` (`text`, `NOT NULL`, default `'#0ea5e9'`)
  * `archived_at` (`timestamptz`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Trigger:** `trg_sync_org_owner_member` insere/atualiza automaticamente o `owner_id` como membro com `role = 'owner'` na tabela `organization_members`.
  * **RLS:** `INSERT` liberado para usuários autenticados definindo-se como `owner_id`; `UPDATE` restrito a gestores (`is_org_manager`); `SELECT` permitido a gestores, alunos da instituição e professores de turmas da instituição.

---

### 3.3 `organization_members`
Registra o vínculo de membros administrativos (`owner` e `admin`) da instituição.

* **Relacionamentos:**
  * `organization_id` referencia `organizations(id)`.
  * `user_id` referencia `profiles(id)`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
  * `user_id` (`uuid`, `NOT NULL`, FK `profiles(id)`)
  * `role` (`text`, `NOT NULL`, check `role in ('owner', 'admin')`)
  * `archived_at` (`timestamptz`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Constraints:** Unique `uq_org_member (organization_id, user_id)`.
  * **RLS:** `SELECT` para o próprio usuário ou gestores da instituição; `INSERT`/`UPDATE` restritos aos gestores da instituição.

---

### 3.4 `organization_students`
Cadastro de alunos no escopo da instituição. Suporta alunos sem conta (`user_id IS NULL`) e posterior *claim* (vínculo de conta de usuário) via convite.

* **Relacionamentos:**
  * `organization_id` referencia `organizations(id)`.
  * `user_id` referencia `profiles(id)` (nullable).
  * Referenciada por `class_enrollments`, `attendance_records`, `assessment_grades` e `invitations`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
  * `user_id` (`uuid`, nullable, FK `profiles(id)`)
  * `full_name` (`text`, `NOT NULL`)
  * `email` (`text`, nullable)
  * `avatar_url` (`text`, nullable)
  * `phone` (`text`, nullable)
  * `emergency_contact` (`text`, nullable)
  * `archived_at` (`timestamptz`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Constraints:** Unique `uq_org_student_user (organization_id, user_id)`.
  * **RLS:** `SELECT` para o próprio aluno, gestores da instituição ou professores de turmas onde o aluno está matriculado. `INSERT`/`UPDATE` permitidos para gestores e professores de turmas da instituição.

---

### 3.5 `classes`
Turmas vinculadas a uma instituição, definindo o modelo/template funcional e parâmetros visuais específicos.

* **Relacionamentos:**
  * `organization_id` referencia `organizations(id)`.
  * Referenciada por `class_teachers`, `class_enrollments`, `attendance_sessions`, `assessments` e `invitations`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
  * `name` (`text`, `NOT NULL`)
  * `template_type` (`text`, `NOT NULL`, check `template_type in ('muay_thai', 'jiu_jitsu', 'school', 'generic')`)
  * `banner_url` (`text`, nullable)
  * `primary_color` (`text`, nullable — herda a cor da instituição quando `NULL`)
  * `archived_at` (`timestamptz`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **RLS:** `INSERT` e `UPDATE` restritos aos gestores da instituição (`is_org_manager`). `SELECT` permitido para gestores da instituição, professores alocados na turma e alunos matriculados na turma.

---

### 3.6 `class_teachers`
Mapeia a alocação de professores em turmas especificas (suporta múltiplos professores por turma).

* **Relacionamentos:**
  * `class_id` referencia `classes(id)`.
  * `teacher_id` referencia `profiles(id)`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
  * `teacher_id` (`uuid`, `NOT NULL`, FK `profiles(id)`)
  * `archived_at` (`timestamptz`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Constraints:** Unique `uq_class_teacher (class_id, teacher_id)`.
  * **RLS:** `INSERT` e `UPDATE` restritos aos gestores da instituição. `SELECT` permitido para o próprio professor, outros professores da turma e gestores da instituição.

---

### 3.7 `class_enrollments`
Matrícula ativa de um aluno em uma turma específica, armazenando o estado atual da modalidade no campo `domain_data`.

* **Relacionamentos:**
  * `class_id` referencia `classes(id)`.
  * `student_id` referencia `organization_students(id)`.
  * Referenciada por `graduation_history`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
  * `student_id` (`uuid`, `NOT NULL`, FK `organization_students(id)`)
  * `domain_data` (`jsonb`, `NOT NULL`, default `'{}'::jsonb`)
  * `enrolled_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `archived_at` (`timestamptz`, nullable)
* **Regras Próprias & Segurança:**
  * **Constraints:** Unique `uq_class_student_enrollment (class_id, student_id)`.
  * **RLS:** `SELECT` para professores da turma, gestores da instituição ou para o próprio aluno. `INSERT`/`UPDATE` para professores da turma e gestores.

---

### 3.8 `graduation_history`
Registra a linha do tempo e histórico de graduações (faixas, graus ou *prajiads*) de um aluno em uma modalidade.

* **Relacionamentos:**
  * `enrollment_id` referencia `class_enrollments(id)`.
  * `awarded_by` referencia `profiles(id)` (nullable).
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `enrollment_id` (`uuid`, `NOT NULL`, FK `class_enrollments(id)`)
  * `rank_code` (`text`, `NOT NULL`)
  * `rank_label` (`text`, `NOT NULL`)
  * `stripes` (`integer`, nullable, check `stripes is null or stripes >= 0`)
  * `color_hex` (`text`, nullable)
  * `secondary_color_hex` (`text`, nullable)
  * `awarded_by` (`uuid`, nullable, FK `profiles(id)`)
  * `awarded_at` (`date`, `NOT NULL`, default `current_date`)
  * `notes` (`text`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **RLS:** `SELECT` para professores da turma, gestores e o próprio aluno. `INSERT` permitido para professores da turma e gestores.

---

### 3.9 `attendance_sessions`
Sessões de chamada vinculadas a uma turma, com ciclo de vida de rascunho (`draft`) até a conclusão (`completed`).

* **Relacionamentos:**
  * `class_id` referencia `classes(id)`.
  * `created_by` referencia `profiles(id)`.
  * Referenciada por `attendance_records`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
  * `created_by` (`uuid`, `NOT NULL`, FK `profiles(id)`)
  * `session_date` (`date`, `NOT NULL`, default `current_date`)
  * `status` (`text`, `NOT NULL`, default `'draft'`, check `status in ('draft', 'completed')`)
  * `notes` (`text`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `completed_at` (`timestamptz`, nullable)
* **Regras Próprias & Segurança:**
  * **Constraints:** Check `chk_completed_timestamp` garante que `completed_at` só seja preenchido se `status = 'completed'`.
  * **Trigger de Imutabilidade:** `trg_immutable_completed_session` lança exceção em qualquer tentativa de `UPDATE` se o status anterior já for `'completed'`.
  * **RLS:** `SELECT` para gestores, professores da turma e alunos. `UPDATE` permitido apenas enquanto `status = 'draft'` por professores da turma ou gestores.

---

### 3.10 `attendance_records`
Lançamento individual da presença de cada aluno em uma sessão de chamada.

* **Relacionamentos:**
  * `session_id` referencia `attendance_sessions(id)`.
  * `student_id` referencia `organization_students(id)`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `session_id` (`uuid`, `NOT NULL`, FK `attendance_sessions(id)`)
  * `student_id` (`uuid`, `NOT NULL`, FK `organization_students(id)`)
  * `status` (`text`, `NOT NULL`, check `status in ('present', 'absent', 'late', 'justified')`)
  * `observation` (`text`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Constraints:** Unique `uq_session_student_record (session_id, student_id)`.
  * **Trigger de Imutabilidade:** `trg_immutable_completed_records` impede inserção, alteração ou exclusão se a sessão pai possuir `status = 'completed'`.
  * **RLS:** `SELECT` para gestores, professores da turma ou estritamente para o próprio aluno (`organization_students.user_id = auth.uid()`). `INSERT`/`UPDATE` restritos a chamadas com sessão em `'draft'`.

---

### 3.11 `assessments`
Avaliações, trabalhos ou exames escolares criados em turmas do template `school`.

* **Relacionamentos:**
  * `class_id` referencia `classes(id)`.
  * Referenciada por `assessment_grades`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `class_id` (`uuid`, `NOT NULL`, FK `classes(id)`)
  * `title` (`text`, `NOT NULL`)
  * `max_score` (`numeric(6,2)`, `NOT NULL`, default `10.00`, check `max_score > 0`)
  * `weight` (`numeric(5,2)`, `NOT NULL`, default `1.00`, check `weight >= 0`)
  * `assessment_date` (`date`, `NOT NULL`, default `current_date`)
  * `archived_at` (`timestamptz`, nullable)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **RLS:** `SELECT` para gestores, professores da turma e alunos da turma. `INSERT`/`UPDATE` para gestores e professores da turma.

---

### 3.12 `assessment_grades`
Notas individuais dos alunos em uma determinada avaliação.

* **Relacionamentos:**
  * `assessment_id` referencia `assessments(id)`.
  * `student_id` referencia `organization_students(id)`.
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `assessment_id` (`uuid`, `NOT NULL`, FK `assessments(id)`)
  * `student_id` (`uuid`, `NOT NULL`, FK `organization_students(id)`)
  * `score` (`numeric(6,2)`, `NOT NULL`, check `score >= 0`)
  * `feedback` (`text`, nullable)
  * `updated_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **Constraints:** Unique `uq_assessment_student_grade (assessment_id, student_id)`.
  * **RLS:** `SELECT` para professores da turma, gestores ou estritamente para o próprio aluno. `INSERT`/`UPDATE` para professores e gestores.

---

### 3.13 `invitations`
Gerenciamento de convites e tokens de acesso para vincular novos administradores, professores ou alunos (com suporte a *claim* de cadastro).

* **Relacionamentos:**
  * `organization_id` referencia `organizations(id)`.
  * `class_id` referencia `classes(id)` (nullable).
  * `organization_student_id` referencia `organization_students(id)` (nullable).
  * `invited_by` referencia `profiles(id)`.
  * `accepted_by` referencia `profiles(id)` (nullable).
* **Colunas:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `token` (`text`, `NOT NULL`, `UNIQUE`, default `encode(gen_random_bytes(16), 'hex')`)
  * `organization_id` (`uuid`, `NOT NULL`, FK `organizations(id)`)
  * `class_id` (`uuid`, nullable, FK `classes(id)`)
  * `role` (`text`, `NOT NULL`, check `role in ('admin', 'teacher', 'student')`)
  * `organization_student_id` (`uuid`, nullable, FK `organization_students(id)`)
  * `invited_email` (`text`, nullable)
  * `invited_by` (`uuid`, `NOT NULL`, FK `profiles(id)`)
  * `expires_at` (`timestamptz`, `NOT NULL`, default `now() + interval '7 days'`)
  * `accepted_at` (`timestamptz`, nullable)
  * `accepted_by` (`uuid`, nullable, FK `profiles(id)`)
  * `created_at` (`timestamptz`, `NOT NULL`, default `now()`)
* **Regras Próprias & Segurança:**
  * **RLS:** `SELECT` para o remetente (`invited_by`), destinatário que aceitou, gestor da instituição ou professor da turma. `INSERT` por gestores da instituição, ou por professores da turma quando `role = 'student'` e `class_id` estiver presente.

---

## 4. Funções, RPCs e Views

### 4.1 Funções Auxiliares de Permissão (`SECURITY DEFINER`)
Evitam consultas circulares (recursão de RLS) e otimizam a verificação de permissões:
- `is_org_manager(p_org_id uuid, p_user_id uuid)`: Retorna `true` se o usuário é `owner_id` ou membro ativo com perfil `owner`/`admin`.
- `is_class_teacher(p_class_id uuid, p_user_id uuid)`: Retorna `true` se o usuário é um professor ativo na turma.
- `is_class_student(p_class_id uuid, p_user_id uuid)`: Retorna `true` se o usuário possui conta vinculada a um aluno ativo matriculado na turma.
- `is_org_student(p_org_id uuid, p_user_id uuid)`: Retorna `true` se o usuário possui cadastro de aluno ativo na instituição.

---

### 4.2 RPCs Transacionais

#### `create_attendance_session`
Cria uma nova sessão de chamada e gera todos os registros de presença dos alunos em uma única transação atômica.
* **Parâmetros:** `p_class_id` (uuid), `p_session_date` (date), `p_notes` (text), `p_records` (jsonb).
* **Comportamento:**
  1. Valida se a sessão está autenticada e se o usuário é professor ou gestor da turma.
  2. Insere o cabeçalho da sessão em `status = 'draft'`.
  3. Se `p_records` for enviado vazio (`'[]'`), popula automaticamente todos os alunos matriculados ativos com `status = 'present'`.
  4. Caso contrário, itera sobre o array JSON e insere cada registro individualmente.

#### `accept_invitation`
Executa o aceite de convites e vincula contas de usuário a instâncias de administradores, professores ou alunos pré-cadastrados (*claim*).
* **Parâmetros:** `p_token` (text).
* **Comportamento:**
  1. Valida se o token existe, não expirou (`expires_at > now()`) e ainda não foi aceito (`accepted_at IS NULL`).
  2. Para `role = 'admin'`: cria/reativa o registro em `organization_members`.
  3. Para `role = 'teacher'`: aloca o usuário em `class_teachers`.
  4. Para `role = 'student'`: caso `organization_student_id` seja fornecido, atualiza o cadastro existente atribuindo `user_id = auth.uid()` e realiza a matrícula em `class_enrollments`. Se for nulo, insere um novo registro de aluno.
  5. Marca `accepted_at = now()` e `accepted_by = auth.uid()`.

---

### 4.3 View de Relatório de Frequência

#### `attendance_summary_by_enrollment`
View construída com `security_invoker = true` para respeitar as políticas de RLS do usuário solicitante.
* **Agrupamento:** Por matrícula (`enrollment_id`), turma (`class_id`) e aluno (`student_id`).
* **Filtros Internos:** Agrega estritamente sessões com `s.status = 'completed'`.
* **Métricas:**
  * `present_count`, `absent_count`, `late_count`, `justified_count`.
  * `attendance_rate`: Calculada como $\frac{\text{present\_count}}{\text{nullif}(\text{present\_count} + \text{absent\_count}, 0)}$.