import { Suspense } from "react";
import { StudentManagement } from "@/features/students/components/student-management";
import { AppHeader } from "@/features/shared/components/app-header";
import { getStudents } from "@/features/students/services/students";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export default function StudentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentsContent />
    </Suspense>
  );
}

async function StudentsContent() {
  const [{ user }, data] = await Promise.all([
    requireAuthenticatedUser(),
    getStudents(),
  ]);
  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : (user.email ?? "Conta");

  return (
    <div className="min-h-screen">
      <AppHeader fullName={displayName} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-secondary">Cadastros</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">
            Alunos
          </h1>
          <p className="mt-2 max-w-2xl text-secondary">
            Os alunos são compartilhados entre as turmas da sua conta; nomes
            iguais podem representar cadastros diferentes.
          </p>
        </div>
        <StudentManagement
          activeMembershipCounts={Object.fromEntries(
            data.activeMembershipCounts,
          )}
          students={data.students}
        />
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-secondary">Carregando alunos...</p>
    </main>
  );
}
