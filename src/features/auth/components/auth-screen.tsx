"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "forgot-password") {
        const redirectTo = new URL(
          "/auth/callback?next=/auth/update-password",
          window.location.origin,
        ).toString();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) {
          setErrorMessage(error.message);
        } else {
          setFeedback(
            "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.",
          );
        }

        return;
      }

      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: fullName.trim() },
                emailRedirectTo: new URL(
                  "/auth/callback?next=/dashboard",
                  window.location.origin,
                ).toString(),
              },
            });

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setFeedback(
          "Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar.",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedback("");
    setErrorMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-primary/10 bg-surface shadow-sm md:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between bg-primary p-8 text-white sm:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
              Chamadas
            </p>
            <h1 className="mt-14 max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Mais tempo para ensinar. Presenças em ordem.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/75">
              Organize suas turmas, registre cada aula e acompanhe a presença
              dos alunos em um só lugar.
            </p>
          </div>
          <p className="mt-16 text-sm text-white/60">
            Simples para usar, seguro para guardar seu histórico.
          </p>
        </div>

        <div className="p-6 sm:p-10 md:p-12">
          <div>
            <p className="text-sm font-medium text-secondary">Bem-vindo(a)</p>
            <h2 className="mt-2 text-2xl font-semibold text-primary">
              {mode === "sign-in"
                ? "Acesse sua conta"
                : mode === "sign-up"
                  ? "Crie sua conta"
                  : "Recupere sua senha"}
            </h2>
          </div>

          {mode !== "forgot-password" && (
            <div
              aria-label="Tipo de acesso"
              className="mt-8 grid grid-cols-2 rounded-xl bg-soft-blue p-1"
            >
            <button
              aria-pressed={mode === "sign-in"}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                mode === "sign-in"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => changeMode("sign-in")}
              type="button"
            >
              Entrar
            </button>
            <button
              aria-pressed={mode === "sign-up"}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                mode === "sign-up"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => changeMode("sign-up")}
              type="button"
            >
              Cadastrar
            </button>
            </div>
          )}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-foreground"
                  htmlFor="full-name"
                >
                  Nome
                </label>
                <input
                  autoComplete="name"
                  className="w-full rounded-xl border border-primary/15 bg-surface px-4 py-3 text-foreground outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                  id="full-name"
                  maxLength={120}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Seu nome"
                  required
                  value={fullName}
                />
              </div>
            )}

            {mode !== "forgot-password" && <div>
              <label
                className="mb-2 block text-sm font-medium text-foreground"
                htmlFor="email"
              >
                E-mail
              </label>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-primary/15 bg-surface px-4 py-3 text-foreground outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                required
                type="email"
                value={email}
              />
            </div>}

            <div>
              <label
                className="mb-2 block text-sm font-medium text-foreground"
                htmlFor="password"
              >
                Senha
              </label>
              <input
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                className="w-full rounded-xl border border-primary/15 bg-surface px-4 py-3 text-foreground outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                id="password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                required
                type="password"
                value={password}
              />
            </div>

            {errorMessage && (
              <p
                className="rounded-xl bg-absent/10 px-4 py-3 text-sm text-absent"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
            {feedback && (
              <p
                className="rounded-xl bg-soft-blue px-4 py-3 text-sm text-primary"
                role="status"
              >
                {feedback}
              </p>
            )}

            <button
              className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Aguarde..."
                : mode === "sign-in"
                  ? "Entrar"
                  : mode === "sign-up"
                    ? "Criar conta"
                    : "Enviar link de recuperação"}
            </button>
          </form>

          {mode === "sign-in" && (
            <button
              className="mt-4 w-full text-center text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => changeMode("forgot-password")}
              type="button"
            >
              Esqueci minha senha
            </button>
          )}
          {mode === "forgot-password" && (
            <button
              className="mt-4 w-full text-center text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => changeMode("sign-in")}
              type="button"
            >
              Voltar para entrar
            </button>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-secondary">
            Biometria e passkeys poderão ser adicionadas em uma próxima etapa.
          </p>
        </div>
      </section>
    </main>
  );
}
