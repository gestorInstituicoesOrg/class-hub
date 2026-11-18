# Chamadas

Aplicação web responsiva para organizar listas de chamada, registrar presença e consultar relatórios por turma, aluno e período.

## Requisitos

- Node.js 20.9 ou superior
- npm
- Um projeto Supabase para autenticação e banco PostgreSQL

## Desenvolvimento local

1. Copie `.env.chamadas.example` para `.env.local` e preencha as credenciais publicáveis do seu projeto Supabase. Se já tiver uma configuração local correta em `.env.example`, pode usá-la como origem sem versionar seus valores.
2. Instale as dependências com `npm install`.
3. Inicie o servidor com `npm run dev`.
4. Abra [http://localhost:3000](http://localhost:3000).

Não use chaves `service_role` ou outras credenciais administrativas no navegador ou em arquivos versionados.

## Supabase Auth

No Supabase, em **Authentication → URL Configuration**, inclua os endereços de callback usados pelos ambientes, por exemplo:

- `http://localhost:3000/auth/callback` para desenvolvimento local;
- `https://<seu-dominio>/auth/callback` para produção.

Configure também a URL principal do site para o domínio de produção. O cadastro exige confirmação de e-mail quando essa opção está habilitada no Supabase. A recuperação de senha usa a mesma rota de callback e retorna à tela `/auth/update-password`.

## Banco de dados

As migrations ficam em `supabase/migrations/`. O schema inicial cria perfis, turmas, alunos, vínculos, chamadas e registros de presença, além de políticas RLS e validações no banco. O projeto já foi sincronizado com a migration inicial; para novas migrations, use `npx supabase db push` somente depois de revisar o SQL e confirmar o projeto vinculado. Nunca edite uma migration que já foi aplicada. O modelo e as regras estão em [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md).

## Funcionalidades

- Cadastro, login, confirmação de e-mail e recuperação de senha.
- Instalação como aplicativo pela tela de login em navegadores compatíveis; no iPhone/iPad, instruções para adicionar à Tela de Início.
- Criação, edição, arquivamento e restauração de turmas.
- Cadastro e edição de alunos, com reutilização entre turmas.
- Chamadas por aula, com marcação de presença/ausência e preservação do histórico.
- Relatórios por turma e período, com totais por aluno e por chamada.

Para instalar, abra a tela de login no navegador e use **Instalar Chamadas** quando a opção aparecer. Em iPhone/iPad, use **Compartilhar → Adicionar à Tela de Início**. A instalação requer HTTPS em produção; `localhost` também é permitido para desenvolvimento.

## Stack

Next.js 16, TypeScript, Tailwind CSS 4 e Supabase. O deploy de produção está previsto para Vercel; a configuração do projeto e dos segredos de deploy será feita quando os ambientes forem criados.
