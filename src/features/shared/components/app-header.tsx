import Link from "next/link";
import { signOutAction } from "@/features/auth/actions/sign-out";

const navigation = [
  { href: "/dashboard", label: "Início" },
  { href: "/lists", label: "Turmas" },
  { href: "/students", label: "Alunos" },
  { href: "/reports", label: "Relatórios" },
];

export function AppHeader({ fullName }: { fullName: string }) {
  return (
    <header className="border-b border-primary/10 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-5">
          <Link
            className="text-sm font-bold uppercase tracking-[0.16em] text-primary"
            href="/dashboard"
          >
            Chamadas
          </Link>
          <form action={signOutAction} className="lg:hidden">
            <button
              className="rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-soft-blue hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              type="submit"
            >
              Sair
            </button>
          </form>
        </div>
        <nav
          aria-label="Navegação principal"
          className="flex gap-1 overflow-x-auto"
        >
          {navigation.map((item) => (
            <Link
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-soft-blue hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <p className="max-w-40 truncate text-sm text-secondary">{fullName}</p>
          <form action={signOutAction}>
            <button
              className="rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-soft-blue hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              type="submit"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
