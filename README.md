# CampusConnect — Student Management System

A full-stack student management portal with three authenticated roles (Staff, Students, Parents), featuring attendance tracking with automated low-attendance email alerts, marks management, fee tracking, and parent-child linking.

## MySQL database and CSV exports

MySQL is the source of truth for application data. While the Next.js server is running, it exports every MySQL table to a separate CSV file under `data/exports/` and refreshes those files every five seconds. Update data through the app or MySQL rather than editing CSV files; exports are regenerated from the database.

CSV files contain stored database values, including email addresses and password hashes (never plaintext passwords). The exports and local environment file are excluded from Git.

---

## Features

### Staff Portal
- **Dashboard**: Student count, attendance summaries, pending fees, quick actions
- **Student Management**: Add, search, filter, deactivate students; link parent accounts
- **Attendance**: Create sessions by class/subject/date, mark PRESENT/ABSENT/EXCUSED, auto-calculate percentages
- **Marks**: Create assessments, record marks with validation (max marks check), publish/unpublish
- **Fees**: Create fee obligations, record payments with unique references, track pending balances
- **Announcements**: Publish to ALL or specific classes
- **Notification Logs**: View all email delivery attempts with status and failure reasons

### Student Portal
- **Dashboard**: Overall attendance %, subject-wise breakdown, fee status, low-attendance warnings
- **My Attendance**: Detailed subject-wise attendance with status badges
- **My Marks**: Assessment-wise results, subject summaries, percentages
- **My Fees**: Fee obligations, payment history, pending balance, overdue status
- **Announcements**: View published announcements

### Parent Portal
- **My Children**: List linked children with quick access
- **Child Dashboard**: Attendance, marks, fees for each child (parent-child relationship enforced)
- **Multi-child Support**: Switch between children if multiple are linked

### Security & Authorization
- **JWT Authentication**: HTTP-only cookies, 8-hour expiration
- **Role-Based Access**: STAFF, STUDENT, PARENT roles with endpoint-level enforcement
- **Parent-Child Linking**: Parents can only view linked children (backend enforced)
- **Attendance Calculation**: Real-time % from records, never manual entry
- **Low-Attendance Alerts**: Automatic emails when attendance < 75% (configurable threshold)
- **Email Deduplication**: Fingerprint-based dedup prevents spam (24h window)
- **Fee Validation**: Prevents overpayment, duplicate payment references

---

## Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4** (utility-first styling)
- Client-side API calls with `fetch`

### Backend
- **Next.js API Routes** (server-side)
- **MySQL 8** (relational database)
- **Drizzle ORM** (type-safe queries)
- **JWT** via `jose` library
- **Bcrypt** for password hashing
- **Nodemailer** for email (mock transport in dev, real SMTP in prod)

### Database Schema
- **users**: Email, password hash, role (STAFF/STUDENT/PARENT)
- **students**: Admission number, class assignment, profile
- **parents**: Parent profile, verified email
- **parent_student**: Many-to-many parent-child links
- **departments**, **class_sections**, **subjects**: Academic structure
- **attendance_sessions**, **attendance_records**: Attendance tracking
- **assessments**, **marks**: Academic performance
- **fee_obligations**, **fee_payments**: Fee management with BigDecimal
- **announcements**: Broadcast messages
- **notifications**, **notification_logs**: Email delivery tracking
- **audit_logs**: Administrative change records

---

## API Endpoints

### Authentication
- `POST /api/auth/login` — Authenticate and set session cookie
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/me` — Current user + profile
- `POST /api/auth/change-password` — Update password

### Students
- `GET /api/students` — List students (staff: all, parents: linked only)
- `POST /api/students` — Create student (staff only)
- `GET /api/students/{id}` — Student details (role-based access)
- `PUT /api/students/{id}` — Update student (staff only)
- `DELETE /api/students/{id}` — Deactivate student (staff only)

### Attendance
- `POST /api/attendance/sessions` — Create session (auto-marks all PRESENT)
- `GET /api/attendance/sessions` — List sessions
- `POST /api/attendance/sessions/{id}/records` — Update attendance, trigger notifications
- `GET /api/attendance/sessions/{id}/records` — Get session records
- `GET /api/attendance/student/{studentId}` — Student attendance summary
- `GET /api/attendance/me` — Current student's attendance

### Marks
- `POST /api/assessments` — Create assessment (staff only)
- `GET /api/assessments` — List assessments (published only for non-staff)
- `POST /api/marks` — Record mark (staff only, validates max)
- `GET /api/marks/student/{studentId}` — Student marks + subject summary
- `GET /api/marks/me` — Current student's marks

### Fees
- `POST /api/fees` — Create fee obligation (staff only)
- `GET /api/fees` — List fees (staff only)
- `POST /api/fees/{id}/payments` — Record payment (staff only, prevents overpayment)
- `GET /api/fees/student/{studentId}` — Student fee summary + payment history
- `GET /api/fees/me` — Current student's fees

### Parents
- `GET /api/parents/me/children` — List linked children
- `GET /api/parents/me/children/{studentId}/dashboard` — Child dashboard data

### Other
- `GET /api/announcements` — List announcements
- `POST /api/announcements` — Publish announcement (staff only)
- `GET /api/notification-logs` — Email delivery logs (staff only)
- `POST /api/seed` — Populate demo data (idempotent)

---

## Local Setup

### Prerequisites
- **Node.js 18+**
- **MySQL 8.0+** (local or hosted)
- **npm** or **yarn**

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd campusconnect
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` in the project root and set your MySQL connection URL:
```env
MYSQL_URL=mysql://campusconnect:campusconnect-dev@127.0.0.1:3306/campusconnect
JWT_SECRET=your-secret-key-change-in-production
ATTENDANCE_THRESHOLD=75

# Optional: Real SMTP (if not set, uses mock transport that logs to console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=CampusConnect <no-reply@yourcollege.edu>
```

### 3. Prepare the Database and Start the App
Start your local MySQL server (or use a hosted MySQL database), then configure `MYSQL_URL` in `.env`. Push the schema and start the Next.js development server:
```bash
npm run db:push
npm run dev
```

### 4. Seed Demo Data
Seed the configured database from a terminal:
```bash
curl -X POST http://localhost:3000/api/seed
```

**Demo Credentials:**
- **Staff**: `admin@campus.local` / `staff123`
- **Student**: `alice@campus.local` / `student123` (low attendance, triggers warnings)
- **Parent**: `parent.alice@campus.local` / `parent123`

Visit `http://localhost:3000`. CSV files will be written to `data/exports/`.

---

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import repo in Vercel
3. Set root directory to project root (not a subdirectory)
4. Create a **hosted MySQL 8** database and configure these environment variables in **Vercel → Project Settings → Environment Variables** for every environment you deploy (Production, and Preview if needed):
   - `MYSQL_URL` (hosted MySQL connection string)
   - `JWT_SECRET` (a strong random secret; do not use the example value)
   - `ATTENDANCE_THRESHOLD` (default: 75)
   - SMTP variables (optional, for real emails)
5. Push the schema to the hosted database with `npm run db:push`, using that database's `MYSQL_URL` in your local shell. Never use a local `127.0.0.1`/`localhost` URL for Vercel.
6. Deploy or redeploy in Vercel after setting the variables.

The app can build without `MYSQL_URL`, but sign-in and other database-backed features require it at runtime. The local `.env` file is not uploaded to Vercel. Seed demo data separately only if you want demo accounts in the hosted database.

### Database
Use a hosted MySQL service such as **Amazon RDS for MySQL** or **Google Cloud SQL for MySQL**.

After deployment, run schema push against the production database:
```bash
MYSQL_URL=<production-url> npm run db:push
```

### Backend
The Next.js app serves both frontend and API routes, so deploying to Vercel handles both.

---

## Attendance Warning System

### How It Works
1. Staff marks attendance via `/api/attendance/sessions/{id}/records`
2. Backend calculates affected student's attendance %
3. If attendance < 75% (configurable via `ATTENDANCE_THRESHOLD`):
   - Sends email to student
   - Sends email to each linked parent (if verified)
   - Logs all attempts in `notification_logs` table
4. Fingerprint-based dedup prevents duplicate emails within 24h

### Email Content
```
Subject: Attendance Warning — CampusConnect (CS301)

Dear Alice Johnson,

Your Data Structures (CS301) attendance is currently 64.29% (9/14 classes),
which is below the required minimum of 75%.

Please contact your class coordinator or subject teacher as soon as possible
to discuss improving your attendance.

— CampusConnect
```

### Testing Email Flow
1. Log in as staff
2. Go to Attendance page
3. Create a session for CS-3A / Data Structures
4. Mark Alice as ABSENT
5. Save attendance
6. Check `/api/notification-logs` or `/staff/logs` to see email delivery

In dev mode (no SMTP configured), emails are logged to the console with `[EMAIL-MOCK]` prefix.

---

## Database Schema (ER Diagram)

```
users (id, email, password_hash, role, display_name, active)
  ├─ students (id, user_id FK, admission_number, class_section_id FK, ...)
  ├─ parents (id, user_id FK, full_name, verified_email)
  └─ staff_profiles (id, user_id FK, employee_id, designation)

parent_student (parent_id FK, student_id FK) — many-to-many

departments (id, name, code)
  └─ class_sections (id, department_id FK, name, semester, academic_year)
      └─ subjects (id, class_section_id FK, name, code)
          ├─ assessments (id, subject_id FK, name, type, max_marks)
          │   └─ marks (id, assessment_id FK, student_id FK, obtained_marks)
          └─ attendance_sessions (id, subject_id FK, class_section_id FK, session_date)
              └─ attendance_records (id, session_id FK, student_id FK, status)

fee_obligations (id, student_id FK, fee_type, amount, due_date)
  └─ fee_payments (id, obligation_id FK, amount, payment_reference, reversed)

announcements (id, title, body, audience, class_section_id FK)
notifications (id, user_id FK, student_id FK, type, message)
notification_logs (id, recipient_email, status, fingerprint)
```

---

## Security Best Practices

1. **Never store plaintext passwords** — bcrypt with 10 rounds
2. **JWT in HTTP-only cookies** — not localStorage
3. **Backend enforces all access control** — frontend routes are UX only
4. **Parent-child links verified server-side** — on every request
5. **Attendance calculated from records** — never trust frontend percentages
6. **Fee amounts use DECIMAL** — no floating point errors
7. **Payment references unique** — prevents double-counting
8. **Email deduplication** — fingerprint + 24h window
9. **No public staff registration** — seed endpoint only (remove in prod)
10. **CORS not needed** — same-origin Next.js deployment

---

## Known Limitations

1. **No timetable module** — can be added as a separate table + UI
2. **No photo upload** — `photo_url` field exists but no upload endpoint
3. **No export to PDF/Excel** — can be added with libraries like `jspdf` or `xlsx`
4. **Attendance history by date** — not yet implemented in UI (data exists in DB)
5. **Audit logs** — table exists but not populated (can add triggers)
6. **No payment gateway** — only manual payment recording

---

## Testing Checklist

- [x] Staff can log in and view dashboard
- [x] Staff can add student with parent link
- [x] Staff can create attendance session and mark students
- [x] Attendance % calculated correctly (attended / total conducted)
- [x] Low-attendance email sent to student + parent
- [x] Duplicate emails suppressed (fingerprint dedup)
- [x] Student can view own attendance, marks, fees
- [x] Student cannot access other students' data
- [x] Parent can view linked child's data
- [x] Parent cannot access unlinked children
- [x] Marks validation (cannot exceed max)
- [x] Fee payment validation (cannot overpay)
- [x] Payment reference uniqueness enforced
- [x] Published/unpublished assessments work correctly
- [x] Role-based route guards work

---

## License

MIT — use freely for educational or commercial purposes.

---

## Support

For issues or questions, open a GitHub issue or contact the maintainer.

**Built with ❤️ using Next.js, MySQL, and Drizzle ORM.**
