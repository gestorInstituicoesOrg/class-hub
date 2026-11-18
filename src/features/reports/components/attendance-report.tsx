import Link from "next/link";
import type { AttendanceReport } from "@/features/reports/services/reports";
import { ReportFilters } from "@/features/reports/components/report-filters";

export function AttendanceReportView({
  report,
}: {
  report: AttendanceReport;
}) {
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  const formatDateTime = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: report.timeZone,
    }).format(new Date(date));

  return (
    <div className="space-y-7">
      <ReportFilters report={report} />
      <section>
        <p className="mb-4 text-sm text-secondary">
          Período de {formatDate(report.from)} a {formatDate(report.to)} ·{" "}
          {report.timeZone}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Chamadas concluídas" value={report.totalSessions} />
          <MetricCard label="Presenças registradas" value={report.totalPresent} />
          <MetricCard label="Ausências registradas" value={report.totalAbsent} />
          <MetricCard
            label="Comparecimento geral"
            value={`${report.attendanceRate}%`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-primary">
            Comparecimento por aluno
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Calculado sobre chamadas concluídas e marcações realizadas.
          </p>
        </div>
        {report.perStudent.length === 0 ? (
          <EmptyReport />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-primary/10 text-secondary">
                  <th className="pb-3 pr-4 font-medium">Aluno</th>
                  <th className="pb-3 px-4 font-medium">Presenças</th>
                  <th className="pb-3 px-4 font-medium">Ausências</th>
                  <th className="pb-3 pl-4 text-right font-medium">Comparecimento</th>
                </tr>
              </thead>
              <tbody>
                {report.perStudent.map((student, index) => {
                  const total = student.present + student.absent;
                  const rate =
                    total === 0
                      ? 0
                      : Math.round((student.present / total) * 100);

                  return (
                    <tr
                      className="border-b border-primary/5 last:border-0"
                      key={`${student.name}-${index}`}
                    >
                      <th className="py-3 pr-4 font-medium text-foreground">
                        {student.name}
                      </th>
                      <td className="px-4 py-3 text-present">
                        {student.present}
                      </td>
                      <td className="px-4 py-3 text-absent">{student.absent}</td>
                      <td className="py-3 pl-4 text-right font-semibold text-primary">
                        {rate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-primary">
            Comparecimento por chamada
          </h2>
        </div>
        {report.sessions.length === 0 ? (
          <EmptyReport />
        ) : (
          <ul className="divide-y divide-primary/10">
            {report.sessions.map((session) => {
              const total = session.present + session.absent;
              const rate =
                total === 0
                  ? 0
                  : Math.round((session.present / total) * 100);

              return (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  key={session.id}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {session.listName}
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      {formatDateTime(session.startedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-present">{session.present} presentes</span>
                    <span className="text-absent">{session.absent} ausentes</span>
                    <strong className="text-primary">{rate}%</strong>
                    <Link
                      className="font-medium text-accent hover:underline"
                      href={`/attendance/${session.id}`}
                    >
                      Detalhes
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
      <p className="text-sm text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-primary">
        {value}
      </p>
    </article>
  );
}

function EmptyReport() {
  return (
    <p className="rounded-xl bg-soft-blue px-4 py-5 text-sm text-primary">
      Não há chamadas concluídas neste período. Chamadas em andamento não
      entram nos relatórios.
    </p>
  );
}
