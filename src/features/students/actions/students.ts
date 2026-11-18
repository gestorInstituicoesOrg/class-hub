"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/state";
import { getActionErrorMessage, getTextField } from "@/lib/actions/state";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidateStudentPages(listId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath("/lists");
  revalidatePath("/reports");
  if (listId) {
    revalidatePath(`/lists/${listId}`);
  }
}

export async function updateStudentAction(
  studentId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = getTextField(formData, "name");
  if (!uuidPattern.test(studentId) || name.length < 1 || name.length > 160) {
    return { error: "Informe um nome de aluno com até 160 caracteres." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("students")
    .update({ name })
    .eq("id", studentId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getActionErrorMessage(error) };
  }
  if (!data) {
    return { error: "Aluno não encontrado ou arquivado." };
  }

  revalidateStudentPages();
  return { success: "Nome do aluno atualizado." };
}

export async function setStudentArchivedAction(
  studentId: string,
  shouldArchive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(studentId)) {
    return { error: "Aluno inválido." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  let updateQuery = supabase
    .from("students")
    .update({ archived_at: shouldArchive ? new Date().toISOString() : null })
    .eq("id", studentId)
    .eq("user_id", user.id);

  updateQuery = shouldArchive
    ? updateQuery.is("archived_at", null)
    : updateQuery.not("archived_at", "is", null);

  const { data, error } = await updateQuery.select("id").maybeSingle();

  if (error) {
    return { error: getActionErrorMessage(error) };
  }
  if (!data) {
    return {
      error: shouldArchive
        ? "Aluno não encontrado ou já arquivado."
        : "Aluno não encontrado ou já está ativo.",
    };
  }

  revalidateStudentPages();
  return { success: shouldArchive ? "Aluno arquivado." : "Aluno restaurado." };
}

export async function addStudentToListAction(
  listId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!uuidPattern.test(listId)) {
    return { error: "Turma inválida." };
  }

  const studentId = getTextField(formData, "studentId");
  const newName = getTextField(formData, "name");
  if (studentId && !uuidPattern.test(studentId)) {
    return { error: "Selecione um aluno válido." };
  }
  if (studentId && newName) {
    return { error: "Escolha um aluno existente ou informe um novo nome." };
  }
  if (!studentId && (newName.length < 1 || newName.length > 160)) {
    return { error: "Informe um nome de aluno com até 160 caracteres." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { data: list, error: listError } = await supabase
    .from("attendance_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (listError) {
    return { error: getActionErrorMessage(listError) };
  }
  if (!list) {
    return { error: "Turma não encontrada ou arquivada." };
  }

  let resolvedStudentId = studentId;
  if (!resolvedStudentId) {
    const { data: student, error: createStudentError } = await supabase
      .from("students")
      .insert({ name: newName, user_id: user.id })
      .select("id")
      .single();

    if (createStudentError) {
      return { error: getActionErrorMessage(createStudentError) };
    }

    resolvedStudentId = student.id;
  } else {
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", resolvedStudentId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();

    if (studentError) {
      return { error: getActionErrorMessage(studentError) };
    }
    if (!student) {
      return { error: "Aluno não encontrado ou arquivado." };
    }
  }

  const { error: membershipError } = await supabase
    .from("list_students")
    .insert({
      list_id: listId,
      student_id: resolvedStudentId,
      user_id: user.id,
    });

  if (membershipError) {
    return { error: getActionErrorMessage(membershipError) };
  }

  revalidateStudentPages(listId);
  return { success: "Aluno adicionado à turma." };
}

export async function removeStudentFromListAction(
  listId: string,
  membershipId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(listId) || !uuidPattern.test(membershipId)) {
    return { error: "Vínculo de aluno inválido." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("list_students")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getActionErrorMessage(error) };
  }
  if (!data) {
    return { error: "Aluno não encontrado nesta turma." };
  }

  revalidateStudentPages(listId);
  return { success: "Aluno removido da lista atual; o histórico foi preservado." };
}
