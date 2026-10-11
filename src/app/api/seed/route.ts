import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  departments,
  classSections,
  subjects,
  staffProfiles,
  students,
  parents,
  parentStudent,
  attendanceSessions,
  attendanceRecords,
  assessments,
  marks,
  feeObligations,
  feePayments,
  announcements,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

/**
 * POST /api/seed — populates demo data. Idempotent: skips if admin already exists.
 * Returns credentials for the admin, students, and parents.
 */
export async function POST() {
  try {
    // Idempotency: if admin exists, refuse
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@campus.local"))
      .limit(1);
    if (admin) {
      return jsonError("Seed already applied. Admin exists.", 409);
    }

    return await db.transaction(async (tx) => {
      // Departments
      const [csDept] = await tx
        .insert(departments)
        .values({ name: "Computer Science", code: "CS" })
        .$returningId();
      const [ecDept] = await tx
        .insert(departments)
        .values({ name: "Electronics", code: "EC" })
        .$returningId();

      // Classes
      const [cs3A] = await tx
        .insert(classSections)
        .values({
          name: "CS-3A",
          semester: 3,
          departmentId: csDept.id,
          academicYear: "2025-2026",
        })
        .$returningId();
      const [cs3B] = await tx
        .insert(classSections)
        .values({
          name: "CS-3B",
          semester: 3,
          departmentId: csDept.id,
          academicYear: "2025-2026",
        })
        .$returningId();
      const [ec3A] = await tx
        .insert(classSections)
        .values({
          name: "EC-3A",
          semester: 3,
          departmentId: ecDept.id,
          academicYear: "2025-2026",
        })
        .$returningId();

      // Subjects
      const [dsa] = await tx
        .insert(subjects)
        .values({ name: "Data Structures", code: "CS301", classSectionId: cs3A.id })
        .$returningId();
      const [os] = await tx
        .insert(subjects)
        .values({ name: "Operating Systems", code: "CS302", classSectionId: cs3A.id })
        .$returningId();
      const [dbms] = await tx
        .insert(subjects)
        .values({ name: "Database Systems", code: "CS303", classSectionId: cs3A.id })
        .$returningId();
      await tx.insert(subjects).values({ name: "Algorithms", code: "CS304", classSectionId: cs3B.id });
      await tx.insert(subjects).values({ name: "Circuits", code: "EC301", classSectionId: ec3A.id });

      // Staff
      const staffPw = await hashPassword("staff123");
      const [staffUser] = await tx
        .insert(users)
        .values({
          email: "admin@campus.local",
          passwordHash: staffPw,
          role: "STAFF",
          displayName: "Dr. Admin Kumar",
        })
        .$returningId();
      const [staffProfile] = await tx
        .insert(staffProfiles)
        .values({
          userId: staffUser.id,
          employeeId: "EMP001",
          designation: "Head of Department",
          departmentId: csDept.id,
        })
        .$returningId();

      // Students (5 in CS-3A, 2 in CS-3B, 1 in EC-3A)
      const studentDefs = [
        { email: "alice@campus.local", name: "Alice Johnson", adm: "CS2025001", cls: cs3A.id, dob: "2005-03-15", gender: "Female" },
        { email: "bob@campus.local", name: "Bob Smith", adm: "CS2025002", cls: cs3A.id, dob: "2005-07-22", gender: "Male" },
        { email: "charlie@campus.local", name: "Charlie Davis", adm: "CS2025003", cls: cs3A.id, dob: "2005-11-05", gender: "Male" },
        { email: "diana@campus.local", name: "Diana Patel", adm: "CS2025004", cls: cs3A.id, dob: "2006-01-30", gender: "Female" },
        { email: "ethan@campus.local", name: "Ethan Wilson", adm: "CS2025005", cls: cs3A.id, dob: "2005-09-18", gender: "Male" },
        { email: "fiona@campus.local", name: "Fiona Lee", adm: "CS2025006", cls: cs3B.id, dob: "2005-04-10", gender: "Female" },
        { email: "george@campus.local", name: "George Brown", adm: "CS2025007", cls: cs3B.id, dob: "2005-12-01", gender: "Male" },
        { email: "hannah@campus.local", name: "Hannah Kim", adm: "EC2025001", cls: ec3A.id, dob: "2005-06-25", gender: "Female" },
      ];
      const studentIds: number[] = [];
      for (const def of studentDefs) {
        const pw = await hashPassword("student123");
        const [u] = await tx
          .insert(users)
          .values({
            email: def.email,
            passwordHash: pw,
            role: "STUDENT",
            displayName: def.name,
          })
          .$returningId();
        const [s] = await tx
          .insert(students)
          .values({
            userId: u.id,
            admissionNumber: def.adm,
            fullName: def.name,
            dateOfBirth: def.dob,
            gender: def.gender,
            enrollmentDate: "2024-07-01",
            classSectionId: def.cls,
            phone: "+1-555-0100",
          })
          .$returningId();
        studentIds.push(s.id);
      }
      const [alice, bob, charlie, diana, ethan, fiona, george, hannah] = studentIds;

      // Parents
      const parentDefs = [
        { email: "parent.alice@campus.local", name: "Mary Johnson", childIds: [alice] },
        { email: "parent.bob@campus.local", name: "Robert Smith", childIds: [bob] },
        { email: "parent.charlie@campus.local", name: "Susan Davis", childIds: [charlie] },
        { email: "parent.fiona@campus.local", name: "Linda Lee", childIds: [fiona] },
        { email: "parent.hannah@campus.local", name: "Paul Kim", childIds: [hannah] },
      ];
      for (const p of parentDefs) {
        const pw = await hashPassword("parent123");
        const [u] = await tx
          .insert(users)
          .values({
            email: p.email,
            passwordHash: pw,
            role: "PARENT",
            displayName: p.name,
          })
          .$returningId();
        const [parent] = await tx
          .insert(parents)
          .values({ userId: u.id, fullName: p.name, verifiedEmail: true })
          .$returningId();
        for (const childId of p.childIds) {
          await tx.insert(parentStudent).values({ parentId: parent.id, studentId: childId });
        }
      }

      // Attendance sessions + records — last 15 days, mix of present/absent to trigger warnings
      const today = new Date();
      const sessionsCreated: number[] = [];
      for (let dayOffset = 0; dayOffset < 20; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() - dayOffset);
        const dateStr = d.toISOString().slice(0, 10);
        // Skip weekends for realism
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        for (const subj of [dsa, os, dbms]) {
          const [sess] = await tx
            .insert(attendanceSessions)
            .values({
              classSectionId: cs3A.id,
              subjectId: subj.id,
              sessionDate: dateStr,
              createdByStaffId: staffProfile.id,
            })
            .$returningId();
          sessionsCreated.push(sess.id);

          // Build attendance for CS-3A students (alice..ethan)
          const classStudents = [alice, bob, charlie, diana, ethan];
          for (const sId of classStudents) {
            let status: "PRESENT" | "ABSENT" = "PRESENT";
            if (sId === alice) {
              // Alice: 60% attendance → should trigger warning
              if (dayOffset % 5 < 2) status = "ABSENT";
            } else if (sId === bob) {
              // Bob: 90%
              if (dayOffset % 10 === 0) status = "ABSENT";
            } else if (sId === charlie) {
              // Charlie: 50% → warning
              if (dayOffset % 2 === 0) status = "ABSENT";
            } else if (sId === diana) {
              // Diana: 75% exactly → NO warning
              if (dayOffset % 4 === 0) status = "ABSENT";
            } else {
              // Ethan: 100%
              status = "PRESENT";
            }
            // Subject-specific variation
            if (subj.id === os.id && sId === bob && dayOffset % 3 === 0) status = "ABSENT";
            await tx.insert(attendanceRecords).values({
              sessionId: sess.id,
              studentId: sId,
              status,
              recordedByStaffId: staffProfile.id,
            });
          }
        }
      }

      // Assessments + marks
      const [midDSA] = await tx
        .insert(assessments)
        .values({
          subjectId: dsa.id,
          name: "Midterm Exam",
          type: "MIDTERM",
          maxMarks: "100",
          examDate: "2025-10-15",
          published: true,
        })
        .$returningId();
      const [quizDSA] = await tx
        .insert(assessments)
        .values({
          subjectId: dsa.id,
          name: "Quiz 1",
          type: "QUIZ",
          maxMarks: "20",
          examDate: "2025-09-20",
          published: true,
        })
        .$returningId();
      const [midOS] = await tx
        .insert(assessments)
        .values({
          subjectId: os.id,
          name: "Midterm Exam",
          type: "MIDTERM",
          maxMarks: "100",
          examDate: "2025-10-18",
          published: true,
        })
        .$returningId();
      const [finalDBMS] = await tx
        .insert(assessments)
        .values({
          subjectId: dbms.id,
          name: "Internal Test",
          type: "INTERNAL",
          maxMarks: "50",
          examDate: "2025-10-20",
          published: false, // NOT yet published — must not be visible to student
        })
        .$returningId();

      const markData: Array<{ a: number; s: number; m: number }> = [
        { a: midDSA.id, s: alice, m: 72 },
        { a: midDSA.id, s: bob, m: 88 },
        { a: midDSA.id, s: charlie, m: 55 },
        { a: midDSA.id, s: diana, m: 78 },
        { a: midDSA.id, s: ethan, m: 92 },
        { a: quizDSA.id, s: alice, m: 15 },
        { a: quizDSA.id, s: bob, m: 18 },
        { a: quizDSA.id, s: charlie, m: 10 },
        { a: quizDSA.id, s: diana, m: 16 },
        { a: quizDSA.id, s: ethan, m: 19 },
        { a: midOS.id, s: alice, m: 68 },
        { a: midOS.id, s: bob, m: 75 },
        { a: midOS.id, s: charlie, m: 42 },
        { a: midOS.id, s: diana, m: 80 },
        { a: midOS.id, s: ethan, m: 85 },
        { a: finalDBMS.id, s: alice, m: 40 },
        { a: finalDBMS.id, s: bob, m: 45 },
      ];
      for (const m of markData) {
        await tx.insert(marks).values({
          assessmentId: m.a,
          studentId: m.s,
          obtainedMarks: String(m.m),
          recordedByStaffId: staffProfile.id,
        });
      }

      // Fee obligations + payments
      const [feeAlice1] = await tx
        .insert(feeObligations)
        .values({
          studentId: alice,
          feeType: "Tuition",
          amount: "25000",
          dueDate: "2025-09-30",
          academicPeriod: "Semester 3",
          description: "Semester 3 tuition",
        })
        .$returningId();
      const [feeAlice2] = await tx
        .insert(feeObligations)
        .values({
          studentId: alice,
          feeType: "Lab Fee",
          amount: "5000",
          dueDate: "2025-09-30",
          academicPeriod: "Semester 3",
        })
        .$returningId();
      await tx
        .insert(feeObligations)
        .values({
          studentId: bob,
          feeType: "Tuition",
          amount: "25000",
          dueDate: "2025-09-30",
          academicPeriod: "Semester 3",
        })
        .$returningId();
      // Alice paid only 20000 → 10000 pending
      await tx.insert(feePayments).values({
        obligationId: feeAlice1.id,
        amount: "20000",
        paymentReference: "PAY-2025-001",
        recordedByStaffId: staffProfile.id,
      });
      await tx.insert(feePayments).values({
        obligationId: feeAlice2.id,
        amount: "0",
        paymentReference: "PAY-2025-002-ZERO",
        recordedByStaffId: staffProfile.id,
      }).catch(() => {/* ignore zero amount test */});

      // Announcement
      await tx.insert(announcements).values({
        title: "Mid-Semester Break Schedule",
        body: "Dear Students,\n\nClasses will be suspended from Oct 25 to Oct 30 for the mid-semester break. Please use this time to prepare for upcoming assessments.\n\n— Academic Office",
        audience: "ALL",
        publishedByStaffId: staffProfile.id,
      });

      return jsonOk(
        {
          message: "Seed applied successfully (demo data).",
          credentials: {
            staff: { email: "admin@campus.local", password: "staff123", role: "STAFF" },
            students: [
              { email: "alice@campus.local", password: "student123", name: "Alice Johnson" },
              { email: "bob@campus.local", password: "student123", name: "Bob Smith" },
              { email: "charlie@campus.local", password: "student123", name: "Charlie Davis" },
              { email: "diana@campus.local", password: "student123", name: "Diana Patel" },
              { email: "ethan@campus.local", password: "student123", name: "Ethan Wilson" },
              { email: "fiona@campus.local", password: "student123", name: "Fiona Lee" },
              { email: "george@campus.local", password: "student123", name: "George Brown" },
              { email: "hannah@campus.local", password: "student123", name: "Hannah Kim" },
            ],
            parents: [
              { email: "parent.alice@campus.local", password: "parent123", name: "Mary Johnson" },
              { email: "parent.bob@campus.local", password: "parent123", name: "Robert Smith" },
              { email: "parent.charlie@campus.local", password: "parent123", name: "Susan Davis" },
            ],
          },
        },
        201
      );
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
