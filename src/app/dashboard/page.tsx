import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AuthenticatedDashboard />
    </Suspense>
  );
}

async function AuthenticatedDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    redirect("/");
  }

  const fullName = data.user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim().length > 0
      ? fullName
      : data.user.email;

  return (
    <main className="flex min-h-screen flex-col px-5 py-8 sm:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Chamadas
        </p>
        <form action={signOutAction}>
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-soft-blue hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            type="submit"
          >
            Sair
          </button>
        </form>
      </header>
      <section className="mx-auto mt-20 w-full max-w-5xl">
        <p className="text-sm font-medium text-secondary">Área do professor</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">
          Olá, {displayName}
        </h1>
        <div className="mt-8 rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">
            Sua área de trabalho está pronta
          </h2>
          <p className="mt-2 max-w-2xl leading-7 text-secondary">
            O próximo passo é conectar as listas e os alunos ao banco de dados
            do Supabase.
          </p>
        </div>
      </section>
    </main>
  );
}

function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen items-center justify-center px-5 py-8"
    >
      <p className="text-sm font-medium text-secondary">Carregando sua conta...</p>
    </main>
  );
}
