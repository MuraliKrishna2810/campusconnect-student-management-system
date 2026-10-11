import { and, eq, sql, count, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  subjects,
  parents,
  parentStudent,
  students,
  users,
} from "@/db/schema";
import { makeFingerprint, sendNotificationEmail } from "@/lib/email";

const THRESHOLD = Number(process.env.ATTENDANCE_THRESHOLD || 75);

export interface AttendanceSummaryRow {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  totalConducted: number;
  attended: number;
  percentage: number;
  belowThreshold: boolean;
}

export interface AttendanceSummary {
  overall: { totalConducted: number; attended: number; percentage: number };
  bySubject: AttendanceSummaryRow[];
}

/**
 * Compute subject-wise + overall attendance for a student.
 * Only counts non-cancelled sessions. EXCUSED is treated as conducted-but-not-attended
 * unless the institution explicitly wants excused to count as present — the default
 * policy follows the spec: attended = PRESENT only.
 */
export async function computeStudentAttendance(
  studentId: number
): Promise<AttendanceSummary> {
  const rows = await db
    .select({
      subjectId: attendanceSessions.subjectId,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      totalConducted: count(),
      attended: sql<number>`SUM(CASE WHEN ${attendanceRecords.status} = 'PRESENT' THEN 1 ELSE 0 END)`,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceSessions.id, attendanceRecords.sessionId)
    )
    .innerJoin(subjects, eq(subjects.id, attendanceSessions.subjectId))
    .where(
      and(
        eq(attendanceRecords.studentId, studentId),
        eq(attendanceSessions.cancelled, false)
      )
    )
    .groupBy(
      attendanceSessions.subjectId,
      subjects.code,
      subjects.name
    )
    .orderBy(asc(subjects.code));

  const bySubject: AttendanceSummaryRow[] = rows.map((r) => {
    const totalConducted = Number(r.totalConducted);
    const attended = Number(r.attended);
    const percentage =
      totalConducted > 0
        ? Number(((attended / totalConducted) * 100).toFixed(2))
        : 0;
    return {
      subjectId: r.subjectId,
      subjectCode: r.subjectCode,
      subjectName: r.subjectName,
      totalConducted,
      attended,
      percentage,
      // strictly less than threshold → warning
      belowThreshold: totalConducted > 0 && percentage < THRESHOLD,
    };
  });

  const totalConducted = bySubject.reduce((a, b) => a + b.totalConducted, 0);
  const attended = bySubject.reduce((a, b) => a + b.attended, 0);
  const percentage =
    totalConducted > 0
      ? Number(((attended / totalConducted) * 100).toFixed(2))
      : 0;

  return {
    overall: { totalConducted, attended, percentage },
    bySubject,
  };
}

/**
 * Evaluate and send warnings for any subject (and overall) that fell below 75%.
 * Uses fingerprint-based dedupe so repeated triggers for the same student + subject
 * + percentage do not spam emails.
 */
export async function evaluateAndNotifyAttendance(
  studentId: number
): Promise<{ emails: number; duplicates: number }> {
  const summary = await computeStudentAttendance(studentId);

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!student) return { emails: 0, duplicates: 0 };

  const [studentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, student.userId))
    .limit(1);
  if (!studentUser) return { emails: 0, duplicates: 0 };

  const subjectsNeedingWarning: AttendanceSummaryRow[] = [
    ...summary.bySubject.filter((s) => s.belowThreshold),
  ];

  // Overall warning (only if overall below threshold AND not already captured by per-subject)
  if (
    summary.overall.totalConducted > 0 &&
    summary.overall.percentage < THRESHOLD
  ) {
    subjectsNeedingWarning.push({
      subjectId: 0,
      subjectCode: "OVERALL",
      subjectName: "Overall Attendance",
      totalConducted: summary.overall.totalConducted,
      attended: summary.overall.attended,
      percentage: summary.overall.percentage,
      belowThreshold: true,
    });
  }

  let emails = 0;
  let duplicates = 0;

  const parentLinks = await db
    .select({
      parentId: parents.id,
      parentUserId: parents.userId,
      parentName: parents.fullName,
      verifiedEmail: parents.verifiedEmail,
      parentEmail: users.email,
    })
    .from(parentStudent)
    .innerJoin(parents, eq(parents.id, parentStudent.parentId))
    .innerJoin(users, eq(users.id, parents.userId))
    .where(
      and(eq(parentStudent.studentId, studentId), eq(users.active, true))
    );

  for (const subj of subjectsNeedingWarning) {
    const subjectLabel =
      subj.subjectCode === "OVERALL"
        ? "overall attendance"
        : `${subj.subjectName} (${subj.subjectCode})`;

    const body = `Dear ${student.fullName},

Your ${subjectLabel} is currently ${subj.percentage.toFixed(2)}% (${subj.attended}/${subj.totalConducted} classes), which is below the required minimum of ${THRESHOLD}%.

Please contact your class coordinator or subject teacher as soon as possible to discuss improving your attendance.

— CampusConnect
`;
    const subject = `Attendance Warning — CampusConnect (${subj.subjectCode})`;

    const studentFingerprint = makeFingerprint([
      "att-warn",
      studentId,
      subj.subjectCode,
      subj.percentage.toFixed(2),
      // Day-level bucket prevents duplicate emails per same-day re-runs
      new Date().toISOString().slice(0, 10),
    ]);

    const studentResult = await sendNotificationEmail({
      to: studentUser.email,
      subject,
      text: body,
      studentId,
      recipientRole: "STUDENT",
      fingerprint: studentFingerprint,
      recipientUserId: studentUser.id,
    });
    if (studentResult.sent) emails++;
    if (studentResult.duplicate) duplicates++;

    // Notify each linked parent
    for (const p of parentLinks) {
      if (!p.verifiedEmail) continue;
      const parentFingerprint = makeFingerprint([
        "att-warn-parent",
        p.parentId,
        studentId,
        subj.subjectCode,
        subj.percentage.toFixed(2),
        new Date().toISOString().slice(0, 10),
      ]);
      const parentBody = `Dear ${p.parentName},

This is to inform you that your ward ${student.fullName} (Admission No. ${student.admissionNumber}) has ${subjectLabel} of ${subj.percentage.toFixed(2)}% (${subj.attended}/${subj.totalConducted} classes), below the required minimum of ${THRESHOLD}%.

Please encourage your ward to attend classes regularly and contact the class coordinator if needed.

— CampusConnect
`;
      const parentResult = await sendNotificationEmail({
        to: p.parentEmail,
        subject: subject.replace("—", `(${student.fullName}) —`),
        text: parentBody,
        studentId,
        recipientRole: "PARENT",
        fingerprint: parentFingerprint,
        recipientUserId: p.parentUserId,
      });
      if (parentResult.sent) emails++;
      if (parentResult.duplicate) duplicates++;
    }
  }

  return { emails, duplicates };
}
