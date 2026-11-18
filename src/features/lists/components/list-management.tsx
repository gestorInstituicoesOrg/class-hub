"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createListAction,
  setListArchivedAction,
  updateListAction,
} from "@/features/lists/actions/lists";
import { ActionFeedback } from "@/features/shared/components/action-feedback";
import { LocalDateTime } from "@/features/shared/components/local-date-time";
import {
  ConfirmSubmitButton,
  SubmitButton,
} from "@/features/shared/components/submit-button";
import { initialActionState } from "@/lib/actions/state";
import type { Tables } from "@/types/database";

type AttendanceList = Tables<"attendance_lists">;

export function ListManagement({
  lists,
  memberCounts,
}: {
  lists: AttendanceList[];
  memberCounts: Record<string, number>;
}) {
  const activeLists = lists.filter((list) => !list.archived_at);
  const archivedLists = lists.filter((list) => list.archived_at);

  return (
    <div className="space-y-10">
      <CreateListForm />
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-primary">Suas turmas</h2>
          <p className="mt-1 text-sm text-secondary">
            {activeLists.length} {activeLists.length === 1 ? "turma ativa" : "turmas ativas"}
          </p>
        </div>
        {activeLists.length === 0 ? (
          <EmptyLists />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeLists.map((list) => (
              <ActiveListCard
                key={list.id}
                list={list}
                memberCount={memberCounts[list.id] ?? 0}
              />
            ))}
          </div>
        )}
      </section>
      {archivedLists.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-primary">
            Turmas arquivadas
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {archivedLists.map((list) => (
              <ArchivedListCard key={list.id} list={list} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CreateListForm() {
  const [state, action] = useActionState(createListAction, initialActionState);

  return (
    <form
      action={action}
      className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold text-primary">Criar turma</h2>
      <p className="mt-1 text-sm text-secondary">
        Cada turma mantém seus alunos, chamadas e relatórios.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="new-list-name">
          Nome da turma
        </label>
        <input
          className="min-w-0 flex-1 rounded-xl border border-primary/15 px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          id="new-list-name"
          maxLength={120}
          name="name"
          placeholder="Ex.: Matemática — 8º ano"
          required
        />
        <SubmitButton
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          Criar turma
        </SubmitButton>
      </div>
      <div className="mt-4">
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

function ActiveListCard({
  list,
  memberCount,
}: {
  list: AttendanceList;
  memberCount: number;
}) {
  const updateAction = updateListAction.bind(null, list.id);
  const [editState, editFormAction] = useActionState(
    updateAction,
    initialActionState,
  );
  const archiveAction = setListArchivedAction.bind(null, list.id, true);
  const [archiveState, archiveFormAction] = useActionState(
    archiveAction,
    initialActionState,
  );

  return (
    <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="break-words text-lg font-semibold text-primary underline-offset-4 hover:underline"
            href={`/lists/${list.id}`}
          >
            {list.name}
          </Link>
          <p className="mt-1 text-sm text-secondary">
            {memberCount} {memberCount === 1 ? "aluno ativo" : "alunos ativos"}
          </p>
        </div>
        <Link
          aria-label={`Abrir turma ${list.name}`}
          className="shrink-0 rounded-lg bg-soft-blue px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href={`/lists/${list.id}`}
        >
          Abrir
        </Link>
      </div>
      <form action={editFormAction} className="mt-5 flex gap-2">
        <label className="sr-only" htmlFor={`list-name-${list.id}`}>
          Nome da turma
        </label>
        <input
          className="min-w-0 flex-1 rounded-lg border border-primary/15 px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          defaultValue={list.name}
          id={`list-name-${list.id}`}
          maxLength={120}
          name="name"
          required
        />
        <SubmitButton className="rounded-lg border border-primary/15 px-3 py-2 text-sm font-medium text-primary hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
          Renomear
        </SubmitButton>
      </form>
      <form action={archiveFormAction} className="mt-3">
        <ConfirmSubmitButton
          className="rounded-lg px-3 py-2 text-sm font-medium text-absent hover:bg-absent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-absent disabled:opacity-60"
          confirmationMessage={`Arquivar a turma "${list.name}"? O histórico será preservado e novas chamadas ficarão desativadas.`}
        >
          Arquivar turma
        </ConfirmSubmitButton>
      </form>
      <div className="mt-3 space-y-2">
        <ActionFeedback state={editState} />
        <ActionFeedback state={archiveState} />
      </div>
    </article>
  );
}

function ArchivedListCard({ list }: { list: AttendanceList }) {
  const restoreAction = setListArchivedAction.bind(null, list.id, false);
  const [state, formAction] = useActionState(restoreAction, initialActionState);

  return (
    <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            className="font-semibold text-primary underline-offset-4 hover:underline"
            href={`/lists/${list.id}`}
          >
            {list.name}
          </Link>
          <p className="mt-1 text-sm text-secondary">
            Arquivada em{" "}
            <LocalDateTime dateOnly value={list.archived_at ?? ""} />
          </p>
        </div>
        <form action={formAction}>
          <SubmitButton className="rounded-lg bg-soft-blue px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
            Restaurar
          </SubmitButton>
        </form>
      </div>
      <div className="mt-3">
        <ActionFeedback state={state} />
      </div>
    </article>
  );
}

function EmptyLists() {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-surface px-6 py-10 text-center">
      <h3 className="font-semibold text-primary">Nenhuma turma cadastrada</h3>
      <p className="mt-2 text-sm text-secondary">
        Crie sua primeira turma para começar a adicionar alunos.
      </p>
    </div>
  );
}
