import type { Tables } from "@/types/database";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export type Student = Tables<"students">;

export async function getStudents(): Promise<{
  students: Student[];
  activeMembershipCounts: Map<string, number>;
}> {
  const { supabase, user } = await requireAuthenticatedUser();
  const [students, memberships] = await Promise.all([
    (async () => {
      const allStudents: Student[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .order("archived_at", { ascending: true })
          .order("name")
          .order("id")
          .range(offset, offset + 999);

        if (error) {
          throw error;
        }
        allStudents.push(...data);
        if (data.length < 1000) {
          return allStudents;
        }
      }
    })(),
    (async () => {
      const allMemberships: Array<{ student_id: string }> = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("list_students")
          .select("student_id")
          .eq("user_id", user.id)
          .is("archived_at", null)
          .order("id")
          .range(offset, offset + 999);

        if (error) {
          throw error;
        }
        allMemberships.push(...data);
        if (data.length < 1000) {
          return allMemberships;
        }
      }
    })(),
  ]);

  const activeMembershipCounts = new Map<string, number>();
  for (const membership of memberships) {
    activeMembershipCounts.set(
      membership.student_id,
      (activeMembershipCounts.get(membership.student_id) ?? 0) + 1,
    );
  }

  return { students, activeMembershipCounts };
}
