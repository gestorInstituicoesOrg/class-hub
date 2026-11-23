# Arquitetura — Class Hub

Este documento descreve a base do **Class Hub**: plataforma web responsiva e mobile-first para gestão de instituições (escolas, academias, empresas e modelos genéricos) e suas turmas, construída com **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **Supabase** (PostgreSQL, Auth e RLS) e **Vercel**. PWA, funcionamento offline e publicação em lojas não fazem parte do MVP.

## Stack

| Tecnologia              | Responsabilidade                                  |
| ----------------------- | ------------------------------------------------- |
| Next.js 16 (App Router) | Rotas, renderização e fronteiras de servidor      |
| TypeScript              | Tipagem estática estrita                          |
| Tailwind CSS 4          | Estilização responsiva e tokens dinâmicos via CSS |
| Supabase                | PostgreSQL, autenticação e RLS                    |
| Vercel                  | Hospedagem e deploy contínuo                      |

Use Node.js 20.9 ou superior. As versões instaladas ficam registradas em `package.json`.

## Identidade visual e White-Label

A aplicação possui uma paleta padrão de fallback e suporta customização visual em dois níveis: **instituição (`organizations`)** e **turma (`classes`)**, injetando variáveis CSS no front-end e derivando variações (`color-mix()` / `oklch()`) sem perder acessibilidade ou legibilidade.

### Tokens padrão (fallback)

| Token                                | Uso                                 | Cor padrão            |
| ------------------------------------ | ----------------------------------- | --------------------- |
| Cor primária (`--brand-primary`)     | Marca, ações principais e destaques | `#153450`             |
| Cor secundária (`--brand-secondary`) | Apoio estrutural e contrastes       | `#3E7C80`             |
| Cor de destaque (`--brand-accent`)   | Badges, indicadores e detalhes      | `#2563EB`             |
| Fundo                                | Fundo geral da aplicação            | `#F7F8FA`             |
| Superfície                           | Cartões e campos                    | `#FFFFFF`             |
| Texto                                | Texto principal                     | `#1F2937`             |
| Texto secundário                     | Informações de apoio                | `#64748B`             |
| Superfície suave                     | Fundos discretos                    | `#EAF0F5`             |
| Presente                             | Estado semântico de presença        | `#2F6B4F`             |
| Ausente                              | Estado semântico de ausência        | `#B54747`             |
| Atrasado / Justificado               | Estados semânticos complementares   | `#B45309` / `#475569` |

Estados de presença também devem ter rótulos ou ícones; cor sozinha não é suficiente.

## Organização

```text
src/
├── app/                         # Rotas, layouts e pontos de entrada Next.js
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── classes/
│   ├── students/
│   ├── graduations/
│   ├── attendance/
│   ├── assessments/
│   ├── invitations/
│   └── reports/
└── lib/                         # Cliente Supabase, constantes de modalidades/graduações e utilitários
supabase/
└── migrations/                  # Alterações versionadas do banco
docs/
├── ARCHITECTURE.md              # Arquitetura da aplicação (este arquivo)
├── DATABASE.md                  # Modelo, tabelas, RLS, RPCs e view do banco
└── migration.md                 # Roadmap e diretrizes de execução por etapas