import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import type { Tables } from "@/types/database";

type ReportFilters = {
  from?: string;
  to?: string;
  listId?: string;
  timeZone?: string;
};

type AttendanceTotals = {
  name: string;
  present: number;
  absent: number;
};

export type AttendanceReport = {
  lists: Array<Pick<Tables<"attendance_lists">, "id" | "name" | "archived_at">>;
  selectedListId: string;
  from: string;
  to: string;
  timeZone: string;
  totalSessions: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
  perStudent: AttendanceTotals[];
  sessions: Array<{
    id: string;
    listId: string;
    listName: string;
    startedAt: string;
    present: number;
    absent: number;
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function localMidnightToUtc(date: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  let timestamp = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const values = new Map(parts.map((part) => [part.type, Number(part.value)]));
    const representedAsUtc = Date.UTC(
      values.get("year") ?? 0,
      (values.get("month") ?? 1) - 1,
      values.get("day") ?? 1,
      values.get("hour") ?? 0,
      values.get("minute") ?? 0,
      values.get("second") ?? 0,
    );
    const targetAsUtc = Date.UTC(year, month - 1, day);
    const adjustment = targetAsUtc - representedAsUtc;
    timestamp += adjustment;
    if (adjustment === 0) {
      break;
    }
  }

  return new Date(timestamp).toISOString();
}

function validateTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export async function getAttendanceReport(
  filters: ReportFilters,
): Promise<AttendanceReport> {
  const today = new Date().toISOString().slice(0, 10);
  const from = filters.from ?? addDays(today, -30);
  const to = filters.to ?? today;
  const timeZone = filters.timeZone ?? "UTC";

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    throw new Error("Informe um período de datas válido.");
  }
  if (!validateTimeZone(timeZone)) {
    throw new Error("O fuso horário do dispositivo não é válido.");
  }
  if (filters.listId && !uuidPattern.test(filters.listId)) {
    throw new Error("Selecione uma turma válida.");
  }

  const { supabase, user } = await requireAuthenticatedUser();
  const lists: AttendanceReport["lists"] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("attendance_lists")
      .select("id,name,archived_at")
      .eq("user_id", user.id)
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

  const listById = new Map(lists.map((list) => [list.id, list]));
  if (filters.listId && !listById.has(filters.listId)) {
    throw new Error("A turma selecionada não foi encontrada.");
  }
  const selectedListId = filters.listId ?? "";
  const sessions: Array<{ id: string; list_id: string; started_at: string }> = [];
  for (let offset = 0; ; offset += 1000) {
    let sessionsQuery = supabase
      .from("attendance_sessions")
      .select("id,list_id,started_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("started_at", localMidnightToUtc(from, timeZone))
      .lt("started_at", localMidnightToUtc(addDays(to, 1), timeZone))
      .order("started_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);

    if (selectedListId) {
      sessionsQuery = sessionsQuery.eq("list_id", selectedListId);
    }

    const { data, error } = await sessionsQuery;
    if (error) {
      throw error;
    }
    sessions.push(...data);
    if (data.length < 1000) {
      break;
    }
  }

  if (sessions.length === 0) {
    return {
      lists,
      selectedListId,
      from,
      to,
      timeZone,
      totalSessions: 0,
      totalPresent: 0,
      totalAbsent: 0,
      attendanceRate: 0,
      perStudent: [],
      sessions: [],
    };
  }

  const entries: Array<{
    session_id: string;
    membership_id: string;
    student_name: string;
    status: string | null;
  }> = [];
  for (let sessionOffset = 0; sessionOffset < sessions.length; sessionOffset += 100) {
    const sessionIds = sessions
      .slice(sessionOffset, sessionOffset + 100)
      .map((session) => session.id);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("attendance_entries")
        .select("session_id,membership_id,student_name,status")
        .in("session_id", sessionIds)
        .not("status", "is", null)
        .order("session_id")
        .order("membership_id")
        .range(offset, offset + 999);

      if (error) {
        throw error;
      }
      entries.push(...data);
      if (data.length < 1000) {
        break;
      }
    }
  }

  const membershipIds = Array.from(
    new Set(entries.map((entry) => entry.membership_id)),
  );
  const memberships: Array<{ id: string; student_id: string }> = [];
  for (let offset = 0; offset < membershipIds.length; offset += 100) {
    const { data, error } = await supabase
      .from("list_students")
      .select("id,student_id")
      .eq("user_id", user.id)
      .in("id", membershipIds.slice(offset, offset + 100));

    if (error) {
      throw error;
    }
    memberships.push(...data);
  }

  const studentIdByMembership = new Map(
    memberships.map((membership) => [
      membership.id,
      membership.student_id,
    ]),
  );
  const entriesBySession = new Map<
    string,
    Array<{
      membershipId: string;
      studentName: string;
      status: string | null;
    }>
  >();

  for (const entry of entries) {
    const sessionEntries = entriesBySession.get(entry.session_id) ?? [];
    sessionEntries.push({
      membershipId: entry.membership_id,
      studentName: entry.student_name,
      status: entry.status,
    });
    entriesBySession.set(entry.session_id, sessionEntries);
  }

  const studentTotals = new Map<string, AttendanceTotals>();
  const sessionRows = sessions.map((session) => {
    const list = listById.get(session.list_id);
    const entries = entriesBySession.get(session.id) ?? [];
    let present = 0;
    let absent = 0;

    for (const entry of entries) {
      const studentId =
        studentIdByMembership.get(entry.membershipId) ?? entry.membershipId;
      const student = studentTotals.get(studentId) ?? {
        name: entry.studentName,
        present: 0,
        absent: 0,
      };

      if (entry.status === "present") {
        present += 1;
        student.present += 1;
      } else if (entry.status === "absent") {
        absent += 1;
        student.absent += 1;
      }

      studentTotals.set(studentId, student);
    }

    return {
      id: session.id,
      listId: session.list_id,
      listName: list?.name ?? "Turma arquivada",
      startedAt: session.started_at,
      present,
      absent,
    };
  });

  const totalPresent = sessionRows.reduce(
    (total, session) => total + session.present,
    0,
  );
  const totalAbsent = sessionRows.reduce(
    (total, session) => total + session.absent,
    0,
  );
  const totalMarked = totalPresent + totalAbsent;

  return {
    lists,
    selectedListId,
    from,
    to,
    timeZone,
    totalSessions: sessions.length,
    totalPresent,
    totalAbsent,
    attendanceRate:
      totalMarked === 0 ? 0 : Math.round((totalPresent / totalMarked) * 100),
    perStudent: Array.from(studentTotals.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
    sessions: sessionRows,
  };
}
