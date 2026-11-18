# Modelo de dados — Chamadas

O schema inicial está versionado em [`supabase/migrations/20261117200000_initial_schema.sql`](../supabase/migrations/20261117200000_initial_schema.sql).

## Entidades e relações

```text
auth.users 1──1 profiles
auth.users 1──N attendance_lists
auth.users 1──N students
attendance_lists N──N students (list_students)
attendance_lists 1──N attendance_sessions
attendance_sessions 1──N attendance_entries
list_students 1──N attendance_entries
```

- `profiles`: nome do usuário; identidade, e-mail e senha são gerenciados pelo Supabase Auth.
- `attendance_lists`: lista/turma de propriedade de uma conta.
- `students`: cadastro nominal pertencente à conta. Um mesmo cadastro pode aparecer em várias listas; nomes repetidos são permitidos para homônimos.
- `list_students`: vínculo entre aluno e lista. O arquivamento do vínculo encerra a participação atual sem apagar presenças anteriores.
- `attendance_sessions`: chamada de uma lista, com `started_at` em `timestamptz` e estado `in_progress` ou `completed`. Não há unicidade por data; várias chamadas no mesmo dia são válidas.
- `attendance_entries`: uma linha por vínculo de aluno incluído no roster no início da chamada. O nome é copiado para `student_name` para preservar o rótulo histórico se o cadastro mudar. `status` é `NULL` enquanto não marcado e depois `present` ou `absent`; `marked_at` registra quando houve marcação.

## Regras de integridade e acesso

- As chaves compostas em `list_students` e `attendance_sessions` impedem vincular alunos de outra conta e impedem que uma presença associe sessão e vínculo de listas diferentes.
- RLS está habilitado em todas as tabelas. A conta autenticada só lê ou altera dados próprios; não há permissões de exclusão física pelo papel `authenticated`.
- O trigger de cadastro cria `profiles` na mesma transação da criação do usuário e exige o metadado `full_name`.
- A função `create_attendance_session` cria a sessão e suas linhas de presença em uma única transação, copiando apenas vínculos e alunos não arquivados. Uma lista sem alunos ativos não inicia chamada.
- Uma sessão só é criada pela função transacional e passa a `completed` se tiver ao menos um aluno e todas as linhas de presença estiverem marcadas. Chamadas concluídas e suas marcações são imutáveis para o papel `authenticated`.
- Um vínculo arquivado pode ser recriado para o mesmo aluno e lista sem sobrescrever o vínculo antigo nem quebrar o histórico.
- O aplicativo deve arquivar em vez de apagar. Exclusão administrativa direta no banco pode eliminar dados dependentes e não é um fluxo do produto.

## Relatórios

Relatórios por lista, aluno e período devem contar apenas sessões concluídas. A taxa de presença é `present / (present + absent)`; sessões incompletas e linhas sem marcação não entram no denominador.

## Datas e fuso

`started_at` e `marked_at` são armazenados com fuso. A aplicação apresenta datas no fuso local do usuário e deve usar limites de período locais ao consultar relatórios. Se usuários precisarem escolher um fuso diferente do dispositivo, adicionar essa preferência ao perfil será uma alteração de schema futura.

## Evolução

Toda mudança de schema deve entrar como nova migration SQL (não editar migrations já aplicadas), atualizar este documento e incluir políticas RLS e índices adequados.
