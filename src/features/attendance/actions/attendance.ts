"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/state";
import { getActionErrorMessage, getTextField } from "@/lib/actions/state";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function startAttendanceSessionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const listId = getTextField(formData, "listId");
  if (!uuidPattern.test(listId)) {
    return { error: "Turma inválida." };
  }

  const { supabase } = await requireAuthenticatedUser();
  const { data: sessionId, error } = await supabase.rpc(
    "create_attendance_session",
    { p_list_id: listId },
  );

  if (error) {
    if (error.code === "42501") {
      return { error: "A turma não existe ou está arquivada." };
    }
    if (error.message.includes("at least one active student")) {
      return {
        error: "Adicione pelo menos um aluno antes de iniciar a chamada.",
      };
    }
    return { error: "Não foi possível iniciar a chamada. Tente novamente." };
  }

  redirect(`/attendance/${sessionId}`);
}

export async function setAttendanceEntryAction(
  sessionId: string,
  membershipId: string,
  status: "present" | "absent",
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(sessionId) || !uuidPattern.test(membershipId)) {
    return { error: "Registro de presença inválido." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id,status,list_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    return { error: getActionErrorMessage(sessionError) };
  }
  if (!session) {
    return { error: "Chamada não encontrada." };
  }
  if (session.status !== "in_progress") {
    return { error: "Esta chamada já foi concluída e não pode ser alterada." };
  }

  const { data, error } = await supabase
    .from("attendance_entries")
    .update({ status })
    .eq("session_id", sessionId)
    .eq("membership_id", membershipId)
    .select("session_id")
    .maybeSingle();

  if (error) {
    return { error: getActionErrorMessage(error) };
  }
  if (!data) {
    return { error: "Aluno não encontrado nesta chamada." };
  }

  revalidatePath(`/attendance/${sessionId}`);
  return { success: "Presença atualizada." };
}

export async function completeAttendanceSessionAction(
  sessionId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  if (!uuidPattern.test(sessionId)) {
    return { error: "Chamada inválida." };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("attendance_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .select("list_id")
    .maybeSingle();

  if (error) {
    if (error.code === "P0001") {
      return {
        error: "Marque presença ou ausência para todos os alunos antes de concluir.",
      };
    }
    return { error: getActionErrorMessage(error) };
  }
  if (!data) {
    return { error: "Chamada não encontrada ou já concluída." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/lists");
  revalidatePath(`/lists/${data.list_id}`);
  revalidatePath(`/attendance/${sessionId}`);
  revalidatePath("/reports");
  return { success: "Chamada concluída. O histórico foi atualizado." };
}
