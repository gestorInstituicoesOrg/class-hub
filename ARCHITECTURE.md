# Arquitetura — Chamadas

Este documento descreve a base do **Chamadas**: Next.js 16 com App Router, TypeScript, Tailwind CSS 4, Supabase (PostgreSQL e Auth) e Vercel. O produto começa como aplicação web responsiva e mobile-first. PWA, funcionamento offline e publicação em lojas não fazem parte do MVP.

## Stack

| Tecnologia | Responsabilidade |
| --- | --- |
| Next.js 16 (App Router) | Rotas, renderização e fronteiras de servidor |
| TypeScript | Tipagem estática estrita |
| Tailwind CSS 4 | Estilização responsiva |
| Supabase | PostgreSQL, autenticação e RLS |
| Vercel | Hospedagem e deploy contínuo |

Use Node.js 20.9 ou superior. As versões instaladas ficam registradas em `package.json`.

## Identidade visual

| Token | Uso | Cor |
| --- | --- | --- |
| Azul-marinho | Marca, navegação e ações principais | `#153450` |
| Fundo | Fundo geral da aplicação | `#F7F8FA` |
| Superfície | Cartões e campos | `#FFFFFF` |
| Texto | Texto principal | `#1F2937` |
| Texto secundário | Informações de apoio | `#64748B` |
| Azul suave | Destaques discretos e fundos | `#EAF0F5` |
| Teal | Acentos de interface | `#3E7C80` |
| Presente | Estado semântico de presença | `#2F6B4F` |
| Ausente | Estado semântico de ausência | `#B54747` |

Estados de presença também devem ter rótulos ou ícones; cor sozinha não é suficiente.

## Organização

```text
src/
├── app/                         # Rotas, layouts e pontos de entrada Next.js
├── features/
│   ├── auth/
│   ├── lists/
│   ├── students/
│   ├── attendance/
│   └── reports/
└── lib/                         # Integrações e utilitários compartilhados
supabase/
└── migrations/                  # Alterações versionadas do banco
docs/
└── DATABASE_SCHEMA.md           # Modelo e regras do domínio
```

Os domínios são separados quando forem implementados; não há módulos de produtos, produção ou vendas neste projeto. Componentes de interface não consultam o Supabase diretamente: serviços concentram o acesso, e RLS permanece como fronteira obrigatória de segurança.

## Decisões do domínio no MVP

- Uma lista representa uma turma e pertence a um usuário.
- Alunos pertencem ao usuário e podem ser vinculados a várias listas. O nome não é único.
- Cada sessão pertence a uma lista e tem um timestamp próprio; várias sessões no mesmo dia são permitidas.
- Cada sessão guarda uma linha de presença por vínculo ativo no momento em que ela é criada. A chamada começa sem marcação e só pode ser concluída quando todos tiverem estado definido.
- O horário é persistido como `timestamptz`; a interface o apresenta no fuso local. Relatórios usam apenas chamadas concluídas.
- Arquivamento preserva listas, alunos, vínculos e histórico. A interface não oferece exclusão física.
- O MVP usa e-mail e senha. CPF, passkeys/biometria, login social e PWA ficam para uma etapa posterior.