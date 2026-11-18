"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  setListArchivedAction,
  updateListAction,
} from "@/features/lists/actions/lists";
import {
  addStudentToListAction,
  removeStudentFromListAction,
} from "@/features/students/actions/students";
import { startAttendanceSessionAction } from "@/features/attendance/actions/attendance";
import type {
  AttendanceList,
  AttendanceSession,
  ListStudentMembership,
} from "@/features/lists/services/lists";
import { ActionFeedback } from "@/features/shared/components/action-feedback";
import {
  ConfirmSubmitButton,
  SubmitButton,
} from "@/features/shared/components/submit-button";
import { initialActionState } from "@/lib/actions/state";
import type { Tables } from "@/types/database";

type MembershipWithName = ListStudentMembership & { studentName: string };
type Student = Tables<"students">;

export function ListDetail({
  list,
  memberships,
  availableStudents,
  sessions,
}: {
  list: AttendanceList;
  memberships: MembershipWithName[];
  availableStudents: Student[];
  sessions: AttendanceSession[];
}) {
  const isArchived = Boolean(list.archived_at);
  const linkedStudentIds = new Set(
    memberships.map((membership) => membership.student_id),
  );
  const addableStudents = availableStudents.filter(
    (student) => !linkedStudentIds.has(student.id),
  );

  return (
    <div className="space-y-8">
      <ListSummary list={list} />
      {!isArchived && (
        <>
          <StartAttendanceForm listId={list.id} />
          <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-primary">Alunos</h2>
                <p className="mt-1 text-sm text-secondary">
                  {memberships.length} {memberships.length === 1 ? "aluno vinculado" : "alunos vinculados"}
                </p>
              </div>
              <Link
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                href="/students"
              >
                Gerenciar cadastros
              </Link>
            </div>
            <div className="mt-5">
              <RosterList listId={list.id} memberships={memberships} />
            </div>
            <div className="mt-7 border-t border-primary/10 pt-6">
              <AddStudentForms
                addableStudents={addableStudents}
                listId={list.id}
              />
            </div>
          </section>
        </>
      )}
      <SessionHistory sessions={sessions} />
    </div>
  );
}

function ListSummary({ list }: { list: AttendanceList }) {
  const isArchived = Boolean(list.archived_at);
  const editAction = updateListAction.bind(null, list.id);
  const [editState, editFormAction] = useActionState(
    editAction,
    initialActionState,
  );
  const archiveAction = setListArchivedAction.bind(null, list.id, true);
  const [archiveState, archiveFormAction] = useActionState(
    archiveAction,
    initialActionState,
  );
  const restoreAction = setListArchivedAction.bind(null, list.id, false);
  const [restoreState, restoreFormAction] = useActionState(
    restoreAction,
    initialActionState,
  );

  return (
    <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/lists"
          >
            &larr; Voltar às turmas
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-primary">{list.name}</h1>
          <p className="mt-1 text-sm text-secondary">
            {isArchived ? "Turma arquivada; histórico disponível para consulta." : "Turma ativa"}
          </p>
        </div>
        {isArchived ? (
          <form action={restoreFormAction}>
            <SubmitButton className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
              Restaurar turma
            </SubmitButton>
          </form>
        ) : (
          <form action={archiveFormAction}>
            <ConfirmSubmitButton
              className="rounded-xl border border-absent/30 px-4 py-3 text-sm font-semibold text-absent hover:bg-absent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-absent disabled:opacity-60"
              confirmationMessage={`Arquivar "${list.name}"? O histórico de chamadas será preservado.`}
            >
              Arquivar turma
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
      {!isArchived && (
        <form action={editFormAction} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`rename-${list.id}`}>
            Nome da turma
          </label>
          <input
            className="min-w-0 flex-1 rounded-xl border border-primary/15 px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
            defaultValue={list.name}
            id={`rename-${list.id}`}
            maxLength={120}
            name="name"
            required
          />
          <SubmitButton className="rounded-xl border border-primary/15 px-4 py-3 text-sm font-medium text-primary hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
            Renomear
          </SubmitButton>
        </form>
      )}
      <div className="mt-3 space-y-2">
        <ActionFeedback state={editState} />
        <ActionFeedback state={archiveState} />
        <ActionFeedback state={restoreState} />
      </div>
    </section>
  );
}

function StartAttendanceForm({ listId }: { listId: string }) {
  const [state, formAction] = useActionState(
    startAttendanceSessionAction,
    initialActionState,
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Registrar uma chamada</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-white/75">
          A chamada começa sem marcações. Confirme presença ou ausência de cada
          aluno antes de concluir.
        </p>
        <div className="mt-3">
          <ActionFeedback state={state} />
        </div>
      </div>
      <form action={formAction} className="shrink-0">
        <input name="listId" type="hidden" value={listId} />
        <SubmitButton
          className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 sm:w-auto"
          pendingLabel="Iniciando..."
        >
          Iniciar chamada
        </SubmitButton>
      </form>
    </section>
  );
}

function RosterList({
  listId,
  memberships,
}: {
  listId: string;
  memberships: MembershipWithName[];
}) {
  if (memberships.length === 0) {
    return (
      <p className="rounded-xl bg-soft-blue px-4 py-4 text-sm text-primary">
        Ainda não há alunos nesta turma.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-primary/10">
      {memberships.map((membership) => (
        <RosterRow key={membership.id} listId={listId} membership={membership} />
      ))}
    </ul>
  );
}

function RosterRow({
  listId,
  membership,
}: {
  listId: string;
  membership: MembershipWithName;
}) {
  const action = removeStudentFromListAction.bind(
    null,
    listId,
    membership.id,
  );
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="font-medium text-foreground">{membership.studentName}</span>
      <div className="flex items-center gap-3">
        <ActionFeedback state={state} />
        <form action={formAction}>
          <ConfirmSubmitButton
            className="rounded-lg px-3 py-2 text-sm font-medium text-absent hover:bg-absent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-absent disabled:opacity-60"
            confirmationMessage={`Remover ${membership.studentName} desta turma? O histórico de chamadas será preservado.`}
          >
            Remover
          </ConfirmSubmitButton>
        </form>
      </div>
    </li>
  );
}

function AddStudentForms({
  listId,
  addableStudents,
}: {
  listId: string;
  addableStudents: Student[];
}) {
  const addAction = addStudentToListAction.bind(null, listId);
  const [existingState, existingAction] = useActionState(
    addAction,
    initialActionState,
  );
  const [newState, newAction] = useActionState(addAction, initialActionState);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={existingAction} className="space-y-3">
        <h3 className="font-semibold text-primary">Vincular aluno existente</h3>
        <label className="sr-only" htmlFor={`existing-student-${listId}`}>
          Selecione um aluno
        </label>
        <select
          className="w-full rounded-xl border border-primary/15 bg-surface px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          defaultValue=""
          id={`existing-student-${listId}`}
          name="studentId"
          required
        >
          <option disabled value="">
            {addableStudents.length > 0
              ? "Selecione um aluno"
              : "Nenhum aluno disponível"}
          </option>
          {addableStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        <SubmitButton
          className="rounded-xl border border-primary/15 px-4 py-3 text-sm font-semibold text-primary hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          pendingLabel="Adicionando..."
        >
          Vincular à turma
        </SubmitButton>
        <ActionFeedback state={existingState} />
      </form>
      <form action={newAction} className="space-y-3">
        <h3 className="font-semibold text-primary">Cadastrar novo aluno</h3>
        <label className="sr-only" htmlFor={`new-student-${listId}`}>
          Nome do aluno
        </label>
        <input
          className="w-full rounded-xl border border-primary/15 px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          id={`new-student-${listId}`}
          maxLength={160}
          name="name"
          placeholder="Nome completo"
          required
        />
        <SubmitButton
          className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          pendingLabel="Salvando..."
        >
          Cadastrar e adicionar
        </SubmitButton>
        <ActionFeedback state={newState} />
      </form>
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: AttendanceSession[] }) {
  return (
    <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-primary">Chamadas recentes</h2>
          <p className="mt-1 text-sm text-secondary">
            O horário é exibido no fuso local do dispositivo.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          href="/reports"
        >
          Ver relatórios
        </Link>
      </div>
      {sessions.length === 0 ? (
        <p className="mt-5 rounded-xl bg-soft-blue px-4 py-4 text-sm text-primary">
          Ainda não há chamadas registradas.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-primary/10">
          {sessions.map((session) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              key={session.id}
            >
              <div>
                <p className="font-medium text-foreground">
                  {new Date(session.started_at).toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-secondary">
                  {session.status === "completed" ? "Concluída" : "Em andamento"}
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
  );
}
