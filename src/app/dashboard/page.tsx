import Link from "next/link";
import { Suspense } from "react";
import { getAttendanceLists } from "@/features/lists/services/lists";
import { AppHeader } from "@/features/shared/components/app-header";
import { LocalDateTime } from "@/features/shared/components/local-date-time";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const [{ user }, overview] = await Promise.all([
    requireAuthenticatedUser(),
    getAttendanceLists(),
  ]);
  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : (user.email ?? "professor(a)");
  const activeLists = overview.lists.filter((list) => !list.archived_at);
  const activeEnrollmentCount = activeLists.reduce(
    (total, list) => total + (overview.memberCounts.get(list.id) ?? 0),
    0,
  );
  const listNames = new Map(overview.lists.map((list) => [list.id, list.name]));

  return (
    <div className="min-h-screen">
      <AppHeader fullName={displayName} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="rounded-3xl bg-primary p-7 text-white shadow-sm sm:p-10">
          <p className="text-sm font-medium text-white/70">Área do professor</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Olá, {displayName}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-white/75">
            Suas turmas e chamadas em um só lugar. Comece uma chamada pela
            página da turma para registrar as presenças.
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            href="/lists"
          >
            Gerenciar turmas
          </Link>
        </section>

        <section
          aria-label="Resumo"
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <SummaryCard
            label="Turmas ativas"
            value={activeLists.length}
            href="/lists"
          />
          <SummaryCard
            label="Vínculos de alunos nas turmas"
            value={activeEnrollmentCount}
            href="/students"
          />
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-primary">Suas turmas</h2>
              <p className="mt-1 text-sm text-secondary">
                Acesse uma turma para iniciar uma chamada ou gerenciar alunos.
              </p>
            </div>
            <Link
              className="text-sm font-medium text-accent hover:underline"
              href="/lists"
            >
              Ver todas
            </Link>
          </div>
          {activeLists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-surface px-6 py-10 text-center">
              <h3 className="font-semibold text-primary">
                Vamos criar sua primeira turma?
              </h3>
              <p className="mt-2 text-sm text-secondary">
                Cadastre uma turma e depois adicione seus alunos.
              </p>
              <Link
                className="mt-5 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                href="/lists"
              >
                Criar turma
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeLists.slice(0, 6).map((list) => (
                <Link
                  className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm transition hover:border-accent/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  href={`/lists/${list.id}`}
                  key={list.id}
                >
                  <h3 className="font-semibold text-primary">{list.name}</h3>
                  <p className="mt-2 text-sm text-secondary">
                    {overview.memberCounts.get(list.id) ?? 0} alunos ativos
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-primary">
                Chamadas recentes
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Horários apresentados no fuso local do dispositivo.
              </p>
            </div>
            <Link
              className="text-sm font-medium text-accent hover:underline"
              href="/reports"
            >
              Abrir relatórios
            </Link>
          </div>
          {overview.recentSessions.length === 0 ? (
            <p className="rounded-xl bg-soft-blue px-4 py-4 text-sm text-primary">
              Nenhuma chamada foi iniciada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-primary/10">
              {overview.recentSessions.map((session) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  key={session.id}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {listNames.get(session.list_id) ?? "Turma"}
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      <LocalDateTime value={session.started_at} /> ·{" "}
                      {session.status === "completed"
                        ? "Concluída"
                        : "Em andamento"}
                    </p>
                  </div>
                  <Link
                    className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    href={`/attendance/${session.id}`}
                  >
                    {session.status === "completed" ? "Consultar" : "Continuar"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm transition hover:border-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      href={href}
    >
      <p className="text-sm text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">
        {value}
      </p>
    </Link>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-secondary">Carregando seu painel...</p>
    </main>
  );
}
