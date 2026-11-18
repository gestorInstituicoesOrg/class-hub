import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-primary/10 bg-surface p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Chamadas
        </p>
        <h1 className="mt-6 text-2xl font-semibold text-primary">
          Não foi possível confirmar o acesso
        </h1>
        <p className="mt-3 leading-7 text-secondary">
          O link pode ter expirado ou já ter sido utilizado. Solicite um novo
          link e tente novamente.
        </p>
        <Link
          className="mt-8 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href="/"
        >
          Voltar para entrar
        </Link>
      </section>
    </main>
  );
}
