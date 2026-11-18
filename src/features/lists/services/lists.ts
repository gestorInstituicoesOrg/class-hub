import type { Tables } from "@/types/database";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export type AttendanceList = Tables<"attendance_lists">;
export type ListStudentMembership = Tables<"list_students">;
export type AttendanceSession = Tables<"attendance_sessions">;

export async function getAttendanceLists(): Promise<{
  lists: AttendanceList[];
  memberCounts: Map<string, number>;
  recentSessions: AttendanceSession[];
}> {
  const { supabase, user } = await requireAuthenticatedUser();
  const lists: AttendanceList[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("attendance_lists")
      .select("*")
      .eq("user_id", user.id)
      .order("archived_at", { ascending: true })
      .order("name")
      .order("id")
      .range(offset, offset + 999);

    if (error) {
      throw error;
    }
    lists.push(...data);
    if (data.length < 1000) {
      break;
    }
  }

  const [membersResult, sessionsResult] = await Promise.all([
    (async () => {
      const memberships: Array<{ list_id: string }> = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("list_students")
          .select("list_id")
          .eq("user_id", user.id)
          .is("archived_at", null)
          .order("id")
          .range(offset, offset + 999);

        if (error) {
          throw error;
        }
        memberships.push(...data);
        if (data.length < 1000) {
          return memberships;
        }
      }
    })(),
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(8),
  ]);

  if (sessionsResult.error) {
    throw sessionsResult.error;
  }

  const memberCounts = new Map<string, number>();
  for (const membership of membersResult) {
    memberCounts.set(
      membership.list_id,
      (memberCounts.get(membership.list_id) ?? 0) + 1,
    );
  }

  return { lists, memberCounts, recentSessions: sessionsResult.data };
}

export async function getAttendanceListDetail(listId: string): Promise<{
  list: AttendanceList;
  memberships: Array<ListStudentMembership & { studentName: string }>;
  availableStudents: Array<Tables<"students">>;
  sessions: AttendanceSession[];
}> {
  const { supabase, user } = await requireAuthenticatedUser();
  const { data: list, error: listError } = await supabase
    .from("attendance_lists")
    .select("*")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (listError) {
    throw listError;
  }
  if (!list) {
    throw new Error("A turma solicitada não foi encontrada.");
  }

  const [memberships, activeStudents, sessionsResult] = await Promise.all([
    (async () => {
      const allMemberships: ListStudentMembership[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("list_students")
          .select("*")
          .eq("list_id", listId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .order("created_at")
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
    (async () => {
      const allStudents: Array<Tables<"students">> = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .is("archived_at", null)
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
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  if (sessionsResult.error) {
    throw sessionsResult.error;
  }

  const studentNames = new Map(
    activeStudents.map((student) => [student.id, student.name]),
  );

  return {
    list,
    memberships: memberships
      .filter((membership) => studentNames.has(membership.student_id))
      .map((membership) => ({
        ...membership,
        studentName: studentNames.get(membership.student_id) ?? "",
      })),
    availableStudents: activeStudents,
    sessions: sessionsResult.data,
  };
}
