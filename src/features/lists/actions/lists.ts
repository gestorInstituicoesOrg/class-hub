"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/state";
import { getActionErrorMessage, getTextField } from "@/lib/actions/state";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createListAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = getTextField(formData, "name");
  if (name.length < 1 || name.length > 120) {
    return { error: "Informe um nome de turma com até 120 caracteres." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { error } = await supabase
    .from("attendance_lists")
    .insert({ name, user_id: user.id });

  if (error) {
    return { error: getActionErrorMessage(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/lists");
  return { success: "Turma criada." };
}

export async function updateListAction(
  listId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = getTextField(formData, "name");
  if (!uuidPattern.test(listId) || name.length < 1 || name.length > 120) {
    return { error: "Confira o nome informado para a turma." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("attendance_lists")
    .update({ name })
    .eq("id", listId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getActionErrorMessage(error) };
  }
  if (!data) {
    return { error: "Turma não encontrada ou arquivada." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  return { success: "Nome da turma atualizado." };
}

export async function setListArchivedAction(
  listId: string,
  shouldArchive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(listId)) {
    return { error: "Turma inválida." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  let updateQuery = supabase
    .from("attendance_lists")
    .update({ archived_at: shouldArchive ? new Date().toISOString() : null })
    .eq("id", listId)
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
        ? "Turma não encontrada ou já arquivada."
        : "Turma não encontrada ou já está ativa.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/reports");
  return { success: shouldArchive ? "Turma arquivada." : "Turma restaurada." };
}
