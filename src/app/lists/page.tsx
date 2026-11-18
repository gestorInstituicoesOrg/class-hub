import { Suspense } from "react";
import { ListManagement } from "@/features/lists/components/list-management";
import { AppHeader } from "@/features/shared/components/app-header";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { getAttendanceLists } from "@/features/lists/services/lists";

export default function ListsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ListsContent />
    </Suspense>
  );
}

async function ListsContent() {
  const [{ user }, data] = await Promise.all([
    requireAuthenticatedUser(),
    getAttendanceLists(),
  ]);
  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : (user.email ?? "Conta");
  const memberCounts = Object.fromEntries(data.memberCounts);

  return (
    <div className="min-h-screen">
      <AppHeader fullName={displayName} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-secondary">Organização</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">
            Turmas
          </h1>
          <p className="mt-2 max-w-2xl text-secondary">
            Cada turma tem sua lista de alunos, histórico de chamadas e
            relatórios.
          </p>
        </div>
        <ListManagement lists={data.lists} memberCounts={memberCounts} />
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-secondary">Carregando suas turmas...</p>
    </main>
  );
}
