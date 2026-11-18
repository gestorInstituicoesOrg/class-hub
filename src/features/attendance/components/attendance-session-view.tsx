"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  completeAttendanceSessionAction,
  setAttendanceEntryAction,
} from "@/features/attendance/actions/attendance";
import type {
  AttendanceEntry,
  AttendanceSession,
} from "@/features/attendance/services/attendance";
import { ActionFeedback } from "@/features/shared/components/action-feedback";
import { LocalDateTime } from "@/features/shared/components/local-date-time";
import { SubmitButton } from "@/features/shared/components/submit-button";
import { initialActionState } from "@/lib/actions/state";

export function AttendanceSessionView({
  session,
  listName,
  entries,
}: {
  session: AttendanceSession;
  listName: string;
  entries: AttendanceEntry[];
}) {
  const completed = session.status === "completed";
  const markedCount = entries.filter(
    (entry) => entry.status === "present" || entry.status === "absent",
  ).length;
  const presentCount = entries.filter(
    (entry) => entry.status === "present",
  ).length;
  const absentCount = entries.filter(
    (entry) => entry.status === "absent",
  ).length;
  const completionAction = completeAttendanceSessionAction.bind(
    null,
    session.id,
  );
  const [completionState, completionFormAction] = useActionState(
    completionAction,
    initialActionState,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
        <Link
          className="text-sm font-medium text-accent hover:underline"
          href={`/lists/${session.list_id}`}
        >
          &larr; Voltar para {listName}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-secondary">{listName}</p>
            <h1 className="mt-1 text-2xl font-semibold text-primary">
              Chamada
            </h1>
            <p className="mt-2 text-sm text-secondary">
              <LocalDateTime value={session.started_at} />
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              completed
                ? "bg-present/10 text-present"
                : "bg-soft-blue text-primary"
            }`}
          >
            {completed ? "Concluída" : "Em andamento"}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              Lista de presença
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {markedCount} de {entries.length} marcados · {presentCount}{" "}
              presentes · {absentCount} ausentes
            </p>
          </div>
          {!completed && (
            <form action={completionFormAction}>
              <SubmitButton
                className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                disabled={entries.length === 0 || markedCount < entries.length}
                pendingLabel="Concluindo..."
              >
                Concluir chamada
              </SubmitButton>
            </form>
          )}
        </div>
        <div className="mt-4">
          <ActionFeedback state={completionState} />
        </div>

        {entries.length === 0 ? (
          <p className="mt-5 rounded-xl bg-soft-blue p-4 text-sm text-primary">
            Esta chamada não tem alunos. Ela não pode ser concluída.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-primary/10">
            {entries.map((entry) => (
              <AttendanceEntryRow
                completed={completed}
                entry={entry}
                key={entry.membership_id}
                sessionId={session.id}
              />
            ))}
          </ul>
        )}
        {!completed && markedCount < entries.length && (
          <p className="mt-5 rounded-xl bg-soft-blue px-4 py-3 text-sm text-primary">
            Marque todos os alunos para habilitar a conclusão da chamada.
          </p>
        )}
      </section>
    </div>
  );
}

function AttendanceEntryRow({
  entry,
  sessionId,
  completed,
}: {
  entry: AttendanceEntry;
  sessionId: string;
  completed: boolean;
}) {
  const markPresentAction = setAttendanceEntryAction.bind(
    null,
    sessionId,
    entry.membership_id,
    "present",
  );
  const [presentState, presentFormAction] = useActionState(
    markPresentAction,
    initialActionState,
  );
  const markAbsentAction = setAttendanceEntryAction.bind(
    null,
    sessionId,
    entry.membership_id,
    "absent",
  );
  const [absentState, absentFormAction] = useActionState(
    markAbsentAction,
    initialActionState,
  );
  const errorState = presentState.error ? presentState : absentState;

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">{entry.student_name}</p>
        {completed ? (
          <p className="mt-1 text-sm text-secondary">
            {entry.status === "present"
              ? "Presente"
              : entry.status === "absent"
                ? "Ausente"
                : "Sem marcação"}
          </p>
        ) : (
          <p className="mt-1 text-sm text-secondary">
            {entry.status === "present"
              ? "Presente"
              : entry.status === "absent"
                ? "Ausente"
                : "Aguardando marcação"}
          </p>
        )}
      </div>
      {completed ? (
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            entry.status === "present"
              ? "bg-present/10 text-present"
              : "bg-absent/10 text-absent"
          }`}
        >
          {entry.status === "present" ? "✓ Presente" : "× Ausente"}
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <form action={presentFormAction}>
            <SubmitButton
              className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-present disabled:opacity-60 ${
                entry.status === "present"
                  ? "bg-present text-white"
                  : "border border-present/30 text-present hover:bg-present/10"
              }`}
              pendingLabel="..."
            >
              ✓ Presente
            </SubmitButton>
          </form>
          <form action={absentFormAction}>
            <SubmitButton
              className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-absent disabled:opacity-60 ${
                entry.status === "absent"
                  ? "bg-absent text-white"
                  : "border border-absent/30 text-absent hover:bg-absent/10"
              }`}
              pendingLabel="..."
            >
              × Ausente
            </SubmitButton>
          </form>
          <ActionFeedback state={errorState} />
        </div>
      )}
    </li>
  );
}
