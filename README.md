# Chamadas

Aplicação web responsiva para organizar listas de chamada, registrar presença e consultar relatórios por turma, aluno e período.

## Requisitos

- Node.js 20.9 ou superior
- npm
- Um projeto Supabase para autenticação e banco PostgreSQL

## Desenvolvimento local

1. Copie `.env.chamadas.example` para `.env.local` e preencha as credenciais publicáveis do seu projeto Supabase.
2. Instale as dependências com `npm install`.
3. Inicie o servidor com `npm run dev`.
4. Abra [http://localhost:3000](http://localhost:3000).

Não use chaves `service_role` ou outras credenciais administrativas no navegador ou em arquivos versionados.

## Banco de dados

As migrations ficam em `supabase/migrations/`. A migration inicial cria perfis, listas, alunos, vínculos, sessões e registros de presença, além de políticas RLS. Aplique-a ao projeto Supabase antes de habilitar as operações do app. O modelo e as regras estão em [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md).

## Stack

Next.js 16, TypeScript, Tailwind CSS 4 e Supabase. O deploy de produção está previsto para Vercel; a configuração do projeto e dos segredos de deploy será feita quando os ambientes forem criados.
