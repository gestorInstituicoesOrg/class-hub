import { Suspense } from "react";
import { AttendanceReportView } from "@/features/reports/components/attendance-report";
import { getAttendanceReport } from "@/features/reports/services/reports";
import { AppHeader } from "@/features/shared/components/app-header";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

type SearchParams = Record<string, string | string[] | undefined>;

function singleValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [query, { user }] = await Promise.all([
    searchParams,
    requireAuthenticatedUser(),
  ]);
  const report = await getAttendanceReport({
    from: singleValue(query.from),
    to: singleValue(query.to),
    listId: singleValue(query.listId),
    timeZone: singleValue(query.timeZone),
  });
  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : (user.email ?? "Conta");

  return (
    <div className="min-h-screen">
      <AppHeader fullName={displayName} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-secondary">Acompanhamento</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">
            Relatórios de presença
          </h1>
          <p className="mt-2 max-w-2xl text-secondary">
            Analise a participação por turma, aluno e período. Somente chamadas
            concluídas são consideradas.
          </p>
        </div>
        <AttendanceReportView report={report} />
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-secondary">Calculando relatórios...</p>
    </main>
  );
}
