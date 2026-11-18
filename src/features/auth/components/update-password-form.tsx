"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmation) {
      setErrorMessage("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a senha. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-primary/10 bg-surface p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Chamadas
        </p>
        <h1 className="mt-6 text-2xl font-semibold text-primary">
          Escolha uma nova senha
        </h1>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="new-password"
            >
              Nova senha
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-primary/15 px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
              id="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="confirm-password"
            >
              Confirme a nova senha
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-primary/15 px-4 py-3 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
              id="confirm-password"
              minLength={8}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </div>
          {errorMessage && (
            <p className="rounded-xl bg-absent/10 px-4 py-3 text-sm text-absent" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Salvando..." : "Atualizar senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
