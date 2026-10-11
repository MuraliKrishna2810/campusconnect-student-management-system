"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import { Card, Button, Select, Label, Input, Table, Badge, Spinner, Alert } from "@/components/ui";

interface ClassSection {
  id: number;
  name: string;
}
interface Subject {
  id: number;
  name: string;
  code: string;
}
interface Assessment {
  id: number;
  name: string;
  type: string;
  maxMarks: number;
  subjectName: string;
}
interface Student {
  id: number;
  fullName: string;
  admissionNumber: string;
}

export default function MarksPage() {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [form, setForm] = useState<{ [studentId: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "green" | "red" } | null>(null);

  useEffect(() => {
    apiGet<{ ok: boolean; data: { items: ClassSection[] } }>("/api/classes").then((r) => setClasses(r.data.items));
  }, []);

  useEffect(() => {
    if (classId) {
      apiGet<{ ok: boolean; data: { items: Subject[] } }>(`/api/subjects?classSectionId=${classId}`).then((r) =>
        setSubjects(r.data.items)
      );
      apiGet<{ ok: boolean; data: { items: Student[] } }>(`/api/students?classSectionId=${classId}`).then((r) =>
        setStudents(r.data.items)
      );
    } else {
      setSubjects([]);
      setStudents([]);
    }
  }, [classId]);

  useEffect(() => {
    if (subjectId) {
      apiGet<{ ok: boolean; data: { items: Assessment[] } }>(`/api/assessments?subjectId=${subjectId}`).then((r) =>
        setAssessments(r.data.items)
      );
    } else {
      setAssessments([]);
    }
  }, [subjectId]);

  async function save() {
    if (!assessmentId) return;
    setLoading(true);
    setMsg(null);
    try {
      let saved = 0;
      for (const [studentId, marks] of Object.entries(form)) {
        if (!marks) continue;
        await apiPost("/api/marks", {
          assessmentId: Number(assessmentId),
          studentId: Number(studentId),
          obtainedMarks: Number(marks),
        });
        saved++;
      }
      setMsg({ text: `Saved ${saved} marks`, tone: "green" });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", tone: "red" });
    } finally {
      setLoading(false);
    }
  }

  const selectedAssessment = assessments.find((a) => a.id === Number(assessmentId));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Marks Management</h1>

      <Card title="Select Assessment">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Class</Label>
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
            <Label>Subject</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId}>
              <option value="">Select…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Assessment</Label>
            <Select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} disabled={!subjectId}>
              <option value="">Select…</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.type} (Max: {a.maxMarks})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}

      {assessmentId && students.length > 0 ? (
        <Card
          title={`Enter Marks — ${selectedAssessment?.name}`}
          actions={<Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save All"}</Button>}
        >
          <Table
            columns={[
              { key: "admissionNumber", label: "Admission No" },
              { key: "fullName", label: "Name" },
              { key: "marks", label: `Obtained Marks (Max: ${selectedAssessment?.maxMarks})` },
            ]}
            rows={students.map((s) => ({
              admissionNumber: s.admissionNumber,
              fullName: s.fullName,
              marks: (
                <Input
                  type="number"
                  min="0"
                  max={selectedAssessment?.maxMarks}
                  value={form[s.id] || ""}
                  onChange={(e) => setForm({ ...form, [s.id]: e.target.value })}
                  className="w-32"
                />
              ),
            }))}
            empty="No students"
          />
        </Card>
      ) : null}
    </div>
  );
}
