import {
  mysqlTable,
  text,
  varchar,
  int,
  boolean,
  timestamp,
  date,
  decimal,
  index,
  uniqueIndex,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

const roleValues = ["STAFF", "STUDENT", "PARENT"] as const;
const attendanceStatusValues = [
  "PRESENT",
  "ABSENT",
  "EXCUSED",
 ] as const;
const assessmentTypeValues = [
  "INTERNAL",
  "MIDTERM",
  "FINAL",
  "QUIZ",
  "ASSIGNMENT",
 ] as const;

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: mysqlEnum("role", roleValues).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
  })
);

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 64 }).notNull().unique(),
});

export const classSections = mysqlTable(
  "class_sections",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    semester: int("semester").notNull(),
    departmentId: int("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    academicYear: varchar("academic_year", { length: 32 }).notNull(),
  },
  (t) => ({
    uniqueClass: uniqueIndex("class_dept_sem_year_idx").on(
      t.departmentId,
      t.semester,
      t.academicYear,
      t.name
    ),
  })
);

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  classSectionId: int("class_section_id")
    .notNull()
    .references(() => classSections.id, { onDelete: "cascade" }),
});

export const staffProfiles = mysqlTable("staff_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id", { length: 64 }).notNull().unique(),
  designation: varchar("designation", { length: 255 }).notNull().default("Lecturer"),
  departmentId: int("department_id").references(() => departments.id),
});

export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    admissionNumber: varchar("admission_number", { length: 64 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: text("gender"),
    phone: text("phone"),
    address: text("address"),
    photoUrl: text("photo_url"),
    classSectionId: int("class_section_id").references(
      () => classSections.id,
      { onDelete: "set null" }
    ),
    enrollmentDate: date("enrollment_date", { mode: "string" }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    admIdx: uniqueIndex("students_admission_idx").on(t.admissionNumber),
    classIdx: index("students_class_idx").on(t.classSectionId),
  })
);

export const parents = mysqlTable("parents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: text("phone"),
  verifiedEmail: boolean("verified_email").notNull().default(true),
});

export const parentStudent = mysqlTable(
  "parent_student",
  {
    id: int("id").autoincrement().primaryKey(),
    parentId: int("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relation: varchar("relation", { length: 64 }).notNull().default("Parent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueLink: uniqueIndex("parent_student_unique").on(t.parentId, t.studentId),
  })
);

export const staffSubjectAssignments = mysqlTable(
  "staff_subject_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    staffId: int("staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniqueAssign: uniqueIndex("staff_subject_unique").on(t.staffId, t.subjectId),
  })
);

export const attendanceSessions = mysqlTable(
  "attendance_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    classSectionId: int("class_section_id")
      .notNull()
      .references(() => classSections.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    cancelled: boolean("cancelled").notNull().default(false),
    notes: text("notes"),
    createdByStaffId: int("created_by_staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueSession: uniqueIndex("session_class_subj_date_idx").on(
      t.classSectionId,
      t.subjectId,
      t.sessionDate
    ),
  })
);

export const attendanceRecords = mysqlTable(
  "attendance_records",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", attendanceStatusValues).notNull(),
    recordedByStaffId: int("recorded_by_staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueRec: uniqueIndex("record_session_student_idx").on(t.sessionId, t.studentId),
    studentIdx: index("record_student_idx").on(t.studentId),
  })
);

export const assessments = mysqlTable(
  "assessments",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", assessmentTypeValues).notNull(),
    maxMarks: decimal("max_marks", { precision: 10, scale: 2 }).notNull(),
    examDate: date("exam_date", { mode: "string" }),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    subjIdx: index("assessment_subject_idx").on(t.subjectId),
  })
);

export const marks = mysqlTable(
  "marks",
  {
    id: int("id").autoincrement().primaryKey(),
    assessmentId: int("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    obtainedMarks: decimal("obtained_marks", { precision: 10, scale: 2 }).notNull(),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    recordedByStaffId: int("recorded_by_staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
  },
  (t) => ({
    uniqueMark: uniqueIndex("mark_assessment_student_idx").on(
      t.assessmentId,
      t.studentId
    ),
    studentIdx: index("mark_student_idx").on(t.studentId),
  })
);

export const feeObligations = mysqlTable(
  "fee_obligations",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    feeType: text("fee_type").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    academicPeriod: text("academic_period").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    studentIdx: index("fee_student_idx").on(t.studentId),
  })
);

export const feePayments = mysqlTable(
  "fee_payments",
  {
    id: int("id").autoincrement().primaryKey(),
    obligationId: int("obligation_id")
      .notNull()
      .references(() => feeObligations.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentReference: varchar("payment_reference", { length: 255 }).notNull().unique(),
    paidAt: timestamp("paid_at").notNull().defaultNow(),
    recordedByStaffId: int("recorded_by_staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    reversed: boolean("reversed").notNull().default(false),
    reversalReason: text("reversal_reason"),
  },
  (t) => ({
    refIdx: uniqueIndex("payment_ref_idx").on(t.paymentReference),
    obligIdx: index("payment_obligation_idx").on(t.obligationId),
  })
);

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("ALL"),
  classSectionId: int("class_section_id").references(() => classSections.id, {
    onDelete: "set null",
  }),
  publishedByStaffId: int("published_by_staff_id")
    .notNull()
    .references(() => staffProfiles.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: int("student_id").references(() => students.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    subject: text("subject"),
    message: text("message").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notification_user_idx").on(t.userId),
  })
);

export const notificationLogs = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").references(() => students.id, {
    onDelete: "set null",
  }),
  recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
  recipientRole: varchar("recipient_role", { length: 32 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  failureReason: text("failure_reason"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  fingerprint: varchar("fingerprint", { length: 255 }).notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  payload: text("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations (useful for query building / type inference)
export const studentsRelations = relations(students, ({ one }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  classSection: one(classSections, {
    fields: [students.classSectionId],
    references: [classSections.id],
  }),
}));

export const classSectionsRelations = relations(classSections, ({ one }) => ({
  department: one(departments, {
    fields: [classSections.departmentId],
    references: [departments.id],
  }),
}));
