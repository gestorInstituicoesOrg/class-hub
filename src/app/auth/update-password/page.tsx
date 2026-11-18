import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-secondary">Validando link...</p>
        </main>
      }
    >
      <PasswordResetContent />
    </Suspense>
  );
}

async function PasswordResetContent() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    redirect("/auth/error");
  }

  return <UpdatePasswordForm />;
}
