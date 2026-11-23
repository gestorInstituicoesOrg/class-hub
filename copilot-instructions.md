# Diretrizes do GitHub Copilot — Class Hub

Estas diretrizes valem para respostas e alterações neste repositório. Consulte também [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/DATABASE.md](./docs/DATABASE.md) e [docs/migration.md](./docs/class-hub-migrations.md) (e [docs/FEATURES_AND_FLOWS.md](./docs/FEATURES_AND_FLOWS.md), quando presente).

## Contexto do produto
- **Class Hub** é uma aplicação web responsiva e mobile-first para gestão de instituições (escolas, academias, empresas e modelos genéricos) e suas turmas.
- **Conta única, múltiplos papéis:** Um usuário autenticado (`profiles` via `auth.users`) pode atuar como `owner`/`admin` de instituições (com permissões administrativas equivalentes nesta fase), `teacher` em uma ou mais turmas (com múltiplos professores possíveis por turma) e `student` em turmas.
- **Alunos e convites (*claim*):** Alunos na instituição (`organization_students`) podem ser cadastrados apenas com `full_name` (demais dados e `user_id` opcionais) e reivindicados via convite (`accept_invitation`) mantendo todo o histórico.
- **Modalidades e chamadas:** Suporte inicial a turmas `muay_thai`, `jiu_jitsu`, `school` e `generic`; `create_attendance_session` cria sessão e registros numa única transação; status suportam `present`, `absent`, `late` e `justified`; sessões `completed` são **imutáveis**; relatórios usam apenas sessões `completed` com taxa `present / (present + absent)` (tratando divisão por zero).
- **Arquivamento e auth:** Sem `DELETE` para usuários; arquivamento via `archived_at` preserva o histórico. MVP usa e-mail e senha (CPF, passkeys/biometria, login social e PWA ficam para etapas futuras).

## Código e arquitetura
- Use TypeScript estrito. Não use `any`, casts inseguros nem supressões de erro.
- Mantenha responsabilidades claras:
  - `src/app/`: rotas, layouts, páginas e fronteiras de entrada do Next.js.
  - `src/features/`: domínios `auth`, `organizations`, `classes`, `students`, `graduations`, `attendance`, `assessments`, `invitations` e `reports`; cada domínio pode conter `components/`, `services/` e tipos próprios.
  - `src/lib/`: cliente Supabase, catálogos fixos de modalidades/graduações e utilitários compartilhados.
- Componentes de apresentação não acessam o Supabase diretamente. Centralize chamadas em serviços e use a sessão autenticada, RPCs e RLS para operações protegidas. Use Route Handlers ou Server Actions quando exigir fronteira de servidor.
- Evite criar camadas sem necessidade; mantenha cada abstração proporcional ao domínio.

## Interface
- Use Tailwind CSS v4 para estilização e variáveis CSS para tokens dinâmicos (white-label por instituição e turma, com fallback padrão em `src/app/globals.css`).
- Mantenha acessibilidade, contraste legível e rótulos/ícones junto aos estados semânticos de presença (`present`, `absent`, `late`, `justified`); cor sozinha não é suficiente.
- Priorize layouts responsivos, estados de foco visíveis e funcionamento em telas pequenas e desktop.

## Supabase e dados
- Trate `docs/DATABASE.md` como fonte da verdade do schema aplicado; mantenha migrations em `supabase/migrations/` e atualize a documentação ao alterar o banco.
- Armazene datas/horários apropriados como `timestamptz` e apresente-os no fuso local do usuário.
- Habilite RLS em todas as tabelas e utilize as funções/RPCs do banco (`create_attendance_session`, `accept_invitation`, `is_org_manager`, `is_class_teacher`, `is_class_student`, `is_org_student`).
- Nunca exponha `service_role` nem segredos no cliente ou no controle de versão. Use `.env.local` localmente e arquivos `.env*.example` sem valores reais.