import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListDetail } from "@/features/lists/components/list-detail";
import { AppHeader } from "@/features/shared/components/app-header";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { getAttendanceListDetail } from "@/features/lists/services/lists";

export default function ListPage({
  params,
}: PageProps<"/lists/[listId]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ListContent params={params} />
    </Suspense>
  );
}

async function ListContent({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const [{ user }, result] = await Promise.all([
    requireAuthenticatedUser(),
    getAttendanceListDetail(listId),
  ]);
  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : (user.email ?? "Conta");

  if (!result.list) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <AppHeader fullName={displayName} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <ListDetail {...result} />
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-secondary">Carregando turma...</p>
    </main>
  );
}
