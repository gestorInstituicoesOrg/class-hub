export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl rounded-3xl border border-primary/10 bg-surface p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Chamadas
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
          Presenças organizadas, aula após aula.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-secondary">
          Organize suas turmas, registre cada chamada e acompanhe a participação
          dos alunos em um só lugar.
        </p>
        <div className="mt-10 rounded-2xl bg-soft-blue p-5 text-sm leading-6 text-primary">
          A base do projeto está pronta. A autenticação e o cadastro das turmas
          serão conectados ao Supabase nas próximas etapas.
        </div>
      </section>
    </main>
  );
}
