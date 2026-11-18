"use client";

import type { AttendanceReport } from "@/features/reports/services/reports";

export function ReportFilters({
  report,
}: {
  report: AttendanceReport;
}) {
  return (
    <form
      className="grid gap-4 rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
      method="get"
      onSubmit={(event) => {
        const timeZoneField =
          event.currentTarget.elements.namedItem("timeZone");
        if (timeZoneField instanceof HTMLInputElement) {
          timeZoneField.value =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
      }}
    >
      <div>
        <label
          className="mb-2 block text-sm font-medium text-foreground"
          htmlFor="report-list"
        >
          Turma
        </label>
        <select
          className="w-full rounded-xl border border-primary/15 bg-surface px-3 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          defaultValue={report.selectedListId}
          id="report-list"
          name="listId"
        >
          <option value="">Todas as turmas</option>
          {report.lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
              {list.archived_at ? " (arquivada)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-foreground"
          htmlFor="report-from"
        >
          De
        </label>
        <input
          className="w-full rounded-xl border border-primary/15 px-3 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          defaultValue={report.from}
          id="report-from"
          name="from"
          required
          type="date"
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-foreground"
          htmlFor="report-to"
        >
          Até
        </label>
        <input
          className="w-full rounded-xl border border-primary/15 px-3 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          defaultValue={report.to}
          id="report-to"
          name="to"
          required
          type="date"
        />
      </div>
      <input name="timeZone" type="hidden" defaultValue={report.timeZone} />
      <button
        className="self-end rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        type="submit"
      >
        Aplicar filtros
      </button>
    </form>
  );
}
