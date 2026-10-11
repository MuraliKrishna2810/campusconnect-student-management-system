"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Table, Badge, Spinner } from "@/components/ui";

interface MarkRow {
  subjectCode: string;
  subjectName: string;
  assessmentName: string;
  type: string;
  obtainedMarks: number;
  maxMarks: number;
  percentage: number;
  examDate: string | null;
}
interface SubjectSummary {
  subjectCode: string;
  subjectName: string;
  totalMax: number;
  totalObtained: number;
  percentage: number;
  assessments: number;
}

export default function StudentMarksPage() {
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [summary, setSummary] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ ok: boolean; data: { marks: MarkRow[]; summary: SubjectSummary[] } }>("/api/marks/me")
      .then((r) => {
        setMarks(r.data.marks);
        setSummary(r.data.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Marks</h1>

      <Card title="Subject-wise Summary">
        <Table
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Subject" },
            { key: "obtained", label: "Obtained" },
            { key: "max", label: "Max" },
            { key: "pct", label: "Percentage" },
            { key: "assessments", label: "Assessments" },
          ]}
          rows={summary.map((s) => ({
            code: s.subjectCode,
            name: s.subjectName,
            obtained: s.totalObtained.toFixed(2),
            max: s.totalMax.toFixed(2),
            pct: (
              <Badge tone={s.percentage >= 60 ? "green" : s.percentage >= 40 ? "amber" : "red"}>
                {s.percentage.toFixed(2)}%
              </Badge>
            ),
            assessments: s.assessments,
          }))}
          empty="No marks yet"
        />
      </Card>

      <Card title="Detailed Marks">
        <Table
          columns={[
            { key: "subject", label: "Subject" },
            { key: "assessment", label: "Assessment" },
            { key: "type", label: "Type" },
            { key: "marks", label: "Marks" },
            { key: "pct", label: "%" },
          ]}
          rows={marks.map((m) => ({
            subject: `${m.subjectName} (${m.subjectCode})`,
            assessment: m.assessmentName,
            type: <Badge tone="violet">{m.type}</Badge>,
            marks: `${m.obtainedMarks} / ${m.maxMarks}`,
            pct: `${m.percentage.toFixed(1)}%`,
          }))}
          empty="No marks yet"
        />
      </Card>
    </div>
  );
}
