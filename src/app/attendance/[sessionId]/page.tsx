import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AttendanceSessionView } from "@/features/attendance/components/attendance-session-view";
import { getAttendanceSession } from "@/features/attendance/services/attendance";
import { AppHeader } from "@/features/shared/components/app-header";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export default function AttendancePage({
  params,
}: PageProps<"/attendance/[sessionId]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AttendanceContent params={params} />
    </Suspense>
  );
}

async function AttendanceContent({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [{ user }, result] = await Promise.all([
    requireAuthenticatedUser(),
    getAttendanceSession(sessionId),
  ]);
  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : (user.email ?? "Conta");

  if (!result.session) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <AppHeader fullName={displayName} />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
        <AttendanceSessionView {...result} />
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-secondary">Carregando chamada...</p>
    </main>
  );
}
