"use client";

import { useActionState } from "react";
import {
  setStudentArchivedAction,
  updateStudentAction,
} from "@/features/students/actions/students";
import { ActionFeedback } from "@/features/shared/components/action-feedback";
import { LocalDateTime } from "@/features/shared/components/local-date-time";
import {
  ConfirmSubmitButton,
  SubmitButton,
} from "@/features/shared/components/submit-button";
import { initialActionState } from "@/lib/actions/state";
import type { Student } from "@/features/students/services/students";

export function StudentManagement({
  students,
  activeMembershipCounts,
}: {
  students: Student[];
  activeMembershipCounts: Record<string, number>;
}) {
  const activeStudents = students.filter((student) => !student.archived_at);
  const archivedStudents = students.filter((student) => student.archived_at);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-primary">Alunos ativos</h2>
          <p className="mt-1 text-sm text-secondary">
            Os cadastros podem ser vinculados a várias turmas suas.
          </p>
        </div>
        {activeStudents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-primary/20 bg-surface px-6 py-10 text-center text-sm text-secondary">
            Você ainda não cadastrou alunos. Cadastre o primeiro pela página de
            uma turma.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeStudents.map((student) => (
              <StudentCard
                activeListCount={activeMembershipCounts[student.id] ?? 0}
                key={student.id}
                student={student}
              />
            ))}
          </div>
        )}
      </section>
      {archivedStudents.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-primary">
            Alunos arquivados
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {archivedStudents.map((student) => (
              <ArchivedStudentCard key={student.id} student={student} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StudentCard({
  student,
  activeListCount,
}: {
  student: Student;
  activeListCount: number;
}) {
  const updateAction = updateStudentAction.bind(null, student.id);
  const [editState, editFormAction] = useActionState(
    updateAction,
    initialActionState,
  );
  const archiveAction = setStudentArchivedAction.bind(null, student.id, true);
  const [archiveState, archiveFormAction] = useActionState(
    archiveAction,
    initialActionState,
  );

  return (
    <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
      <p className="mb-4 text-sm text-secondary">
        {activeListCount} {activeListCount === 1 ? "turma ativa" : "turmas ativas"}
      </p>
      <form action={editFormAction} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`student-name-${student.id}`}>
          Nome do aluno
        </label>
        <input
          className="min-w-0 flex-1 rounded-lg border border-primary/15 px-3 py-2.5 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          defaultValue={student.name}
          id={`student-name-${student.id}`}
          maxLength={160}
          name="name"
          required
        />
        <SubmitButton className="rounded-lg border border-primary/15 px-3 py-2 text-sm font-medium text-primary hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
          Salvar nome
        </SubmitButton>
      </form>
      <form action={archiveFormAction} className="mt-3">
        <ConfirmSubmitButton
          className="rounded-lg px-3 py-2 text-sm font-medium text-absent hover:bg-absent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-absent disabled:opacity-60"
          confirmationMessage={`Arquivar ${student.name}? Ele deixará de aparecer nas novas chamadas, e o histórico existente será preservado.`}
        >
          Arquivar aluno
        </ConfirmSubmitButton>
      </form>
      <div className="mt-3 space-y-2">
        <ActionFeedback state={editState} />
        <ActionFeedback state={archiveState} />
      </div>
    </article>
  );
}

function ArchivedStudentCard({ student }: { student: Student }) {
  const restoreAction = setStudentArchivedAction.bind(null, student.id, false);
  const [state, formAction] = useActionState(restoreAction, initialActionState);

  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
      <div>
        <p className="font-medium text-primary">{student.name}</p>
        <p className="mt-1 text-sm text-secondary">
          Arquivado em{" "}
          <LocalDateTime dateOnly value={student.archived_at ?? ""} />
        </p>
      </div>
      <form action={formAction}>
        <SubmitButton className="rounded-lg bg-soft-blue px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
          Restaurar
        </SubmitButton>
      </form>
      <div className="w-full">
        <ActionFeedback state={state} />
      </div>
    </article>
  );
}
