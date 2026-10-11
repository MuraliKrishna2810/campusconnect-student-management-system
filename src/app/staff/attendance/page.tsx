"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import { Card, Button, Select, Label, Table, Badge, Spinner, Alert } from "@/components/ui";

interface ClassSection {
  id: number;
  name: string;
  semester: number;
  departmentName: string;
}
interface Subject {
  id: number;
  name: string;
  code: string;
}
interface StudentRecord {
  id: number;
  studentId: number;
  fullName: string;
  admissionNumber: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "green" | "red" | "blue" } | null>(null);

  useEffect(() => {
    apiGet<{ ok: boolean; data: { items: ClassSection[] } }>("/api/classes").then((r) => setClasses(r.data.items));
  }, []);

  useEffect(() => {
    if (classId) {
      apiGet<{ ok: boolean; data: { items: Subject[] } }>(`/api/subjects?classSectionId=${classId}`).then((r) =>
        setSubjects(r.data.items)
      );
    } else {
      setSubjects([]);
    }
  }, [classId]);

  async function createSession() {
    if (!classId || !subjectId) {
      setMsg({ text: "Select class and subject first", tone: "red" });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiPost<{ ok: boolean; data: { id: number } }>("/api/attendance/sessions", {
        classSectionId: Number(classId),
        subjectId: Number(subjectId),
        sessionDate: date,
      });
      setSessionId(res.data.id);
      await loadRecords(res.data.id);
      setMsg({ text: "Session created. Mark attendance below.", tone: "blue" });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", tone: "red" });
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(sid: number) {
    setLoading(true);
    try {
      const res = await apiGet<{ ok: boolean; data: { records: StudentRecord[] } }>(`/api/attendance/sessions/${sid}/records`);
      setRecords(res.data.records);
    } finally {
      setLoading(false);
    }
  }

  function setStatus(studentId: number, status: "PRESENT" | "ABSENT" | "EXCUSED") {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  async function saveAttendance() {
    if (!sessionId) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiPost<{ ok: boolean; data: { updated: number; notificationSummary: { emails: number; duplicates: number } } }>(
        `/api/attendance/sessions/${sessionId}/records`,
        { records: records.map((r) => ({ studentId: r.studentId, status: r.status })) }
      );
      const n = res.data.notificationSummary;
      setMsg({
        text: `Saved ${res.data.updated} records. Emails sent: ${n.emails}, duplicates suppressed: ${n.duplicates}`,
        tone: "green",
      });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", tone: "red" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mark Attendance</h1>

      <Card title="Session Setup">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label required>Class</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Subject</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId}>
              <option value="">Select…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Date</Label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={createSession} disabled={loading || !classId || !subjectId}>
              {loading ? "Loading…" : "Create / Load Session"}
            </Button>
          </div>
        </div>
      </Card>

      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}

      {sessionId ? (
        <Card title="Attendance Records" actions={<Button onClick={saveAttendance} disabled={saving}>{saving ? "Saving…" : "Save Attendance"}</Button>}>
          {loading ? (
            <Spinner />
          ) : (
            <Table
              columns={[
                { key: "admissionNumber", label: "Admission No" },
                { key: "fullName", label: "Name" },
                { key: "status", label: "Status" },
              ]}
              rows={records.map((r) => ({
                admissionNumber: r.admissionNumber,
                fullName: r.fullName,
                status: (
                  <div className="flex gap-1">
                    <Button
                      variant={r.status === "PRESENT" ? "primary" : "ghost"}
                      onClick={() => setStatus(r.studentId, "PRESENT")}
                    >
                      Present
                    </Button>
                    <Button
                      variant={r.status === "ABSENT" ? "danger" : "ghost"}
                      onClick={() => setStatus(r.studentId, "ABSENT")}
                    >
                      Absent
                    </Button>
                  </div>
                ),
              }))}
              empty="No students in this class"
            />
          )}
        </Card>
      ) : null}
    </div>
  );
}
