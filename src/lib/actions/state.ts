export type ActionState = {
  error?: string;
  success?: string;
};

export const initialActionState: ActionState = {};

export function getActionErrorMessage(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Esse registro já existe ou já está vinculado.";
  }

  if (error.code === "42501") {
    return "Você não tem permissão para realizar essa operação.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

export function getTextField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
