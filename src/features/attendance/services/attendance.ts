import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import type { Tables } from "@/types/database";

export type AttendanceEntry = Tables<"attendance_entries">;
export type AttendanceSession = Tables<"attendance_sessions">;

export async function getAttendanceSession(sessionId: string): Promise<{
  session: AttendanceSession;
  listName: string;
  entries: AttendanceEntry[];
}> {
  const { supabase, user } = await requireAuthenticatedUser();
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }
  if (!session) {
    throw new Error("A chamada solicitada não foi encontrada.");
  }

  const [listResult, entries] = await Promise.all([
    supabase
      .from("attendance_lists")
      .select("name")
      .eq("id", session.list_id)
      .eq("user_id", user.id)
      .single(),
    (async () => {
      const allEntries: AttendanceEntry[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("attendance_entries")
          .select("*")
          .eq("session_id", sessionId)
          .order("student_name")
          .order("membership_id")
          .range(offset, offset + 999);

        if (error) {
          throw error;
        }
        allEntries.push(...data);
        if (data.length < 1000) {
          return allEntries;
        }
      }
    })(),
  ]);

  if (listResult.error) {
    throw listResult.error;
  }

  return {
    session,
    listName: listResult.data.name,
    entries,
  };
}
