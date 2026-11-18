# Diretrizes do GitHub Copilot — Chamadas

Estas diretrizes valem para respostas e alterações neste repositório. Consulte também [ARCHITECTURE.md](./ARCHITECTURE.md) e [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md).

## Contexto do produto
- Chamadas é um aplicativo responsivo, mobile-first, para professores organizarem turmas e registrarem presença.
- No MVP, a conta usa nome, e-mail e senha. CPF, passkeys/biometria e login social ficam para etapas futuras.
- Cada usuário tem listas privadas. Alunos são compartilháveis entre listas do mesmo usuário; nomes não são identificadores únicos, então homônimos podem ser cadastros distintos.
- Uma lista pode ter várias chamadas no mesmo dia. Cada chamada registra data e hora, começa sem marcações e só pode ser concluída depois que todos os alunos tiverem presença ou ausência definida.
- Listas, alunos e vínculos são arquivados, não apagados, para preservar o histórico. Relatórios consideram chamadas concluídas.

## Código e arquitetura
- Use TypeScript estrito. Não use `any`, casts inseguros nem supressões de erro.
- Mantenha responsabilidades claras:
  - `src/app/`: rotas, layouts, páginas e fronteiras de entrada do Next.js.
  - `src/features/`: domínios `auth`, `lists`, `students`, `attendance` e `reports`; cada domínio pode conter `components/`, `services/` e tipos próprios.
  - `src/lib/`: integrações e utilitários compartilhados.
- Componentes de apresentação não acessam o Supabase diretamente. Centralize chamadas em serviços e use a sessão autenticada e RLS para operações protegidas. Use Route Handlers ou Server Actions quando a operação exigir uma fronteira de servidor.
- Evite criar camadas sem necessidade; mantenha cada abstração proporcional ao domínio.

## Interface
- Use Tailwind CSS v4 para estilização. Mantenha os tokens de marca em `src/app/globals.css`; não crie folhas de estilo paralelas sem necessidade.
- Paleta: azul-marinho `#153450`, fundo `#F7F8FA`, superfícies `#FFFFFF`, texto `#1F2937`, texto secundário `#64748B`, azul suave `#EAF0F5` e teal `#3E7C80`. Verde `#2F6B4F` e vermelho `#B54747` são semânticos para presença e ausência, não devem ser o único meio de comunicar estado.
- Priorize acessibilidade, estados de foco visíveis e layouts que funcionem em telas pequenas e desktop.

## Supabase e dados
- Mantenha migrations SQL versionadas em `supabase/migrations/` e atualize `docs/DATABASE_SCHEMA.md` junto com mudanças no modelo.
- Armazene chamadas como timestamps com fuso (`timestamptz`) e apresente-as no fuso local do usuário.
- Habilite RLS em todas as tabelas com dados de usuário e restrinja cada registro ao proprietário autenticado.
- Use a chave publicável/anon apenas conforme necessário no cliente. Nunca exponha `service_role` nem outra chave administrativa; não coloque credenciais reais em arquivos de exemplo ou no controle de versão.
- Credenciais locais ficam em `.env.local`; use `.env.chamadas.example` como template versionável e não reutilize arquivos locais de ambiente. Nunca reproduza valores reais em código, logs ou documentação.