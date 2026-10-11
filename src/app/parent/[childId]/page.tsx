"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/client";
import { Card, Stat, Spinner, Table, Badge, Alert } from "@/components/ui";

interface DashboardData {
  student: {
    id: number;
    fullName: string;
    admissionNumber: string;
    email: string;
    className: string | null;
    semester: number | null;
    departmentName: string | null;
  };
  attendance: {
    overall: { totalConducted: number; attended: number; percentage: number };
    bySubject: Array<{
      subjectCode: string;
      subjectName: string;
      percentage: number;
      belowThreshold: boolean;
    }>;
  };
}

interface FeeData {
  totalObligation: number;
  totalPaid: number;
  pending: number;
}

interface MarksData {
  summary: Array<{
    subjectCode: string;
    subjectName: string;
    percentage: number;
    assessments: number;
  }>;
}

export default function ChildDetailPage() {
  const params = useParams();
  const studentId = params.childId as string;
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [fees, setFees] = useState<FeeData | null>(null);
  const [marks, setMarks] = useState<MarksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<{ ok: boolean; data: DashboardData }>(`/api/parents/me/children/${studentId}/dashboard`),
      apiGet<{ ok: boolean; data: FeeData }>(`/api/fees/student/${studentId}`),
      apiGet<{ ok: boolean; data: MarksData }>(`/api/marks/student/${studentId}`),
    ])
      .then(([d, f, m]) => {
        setDash(d.data);
        setFees(f.data);
        setMarks(m.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="p-6">
        <Alert tone="red">{error}</Alert>
      </div>
    );
  }
  if (!dash) return null;

  const overallPct = dash.attendance.overall.percentage;
  const belowThreshold = overallPct > 0 && overallPct < 75;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{dash.student.fullName}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {dash.student.admissionNumber} · {dash.student.departmentName} · {dash.student.className} · Sem{" "}
          {dash.student.semester}
        </p>
      </div>

      {belowThreshold ? (
        <Alert tone="red">
          ⚠ Your ward's overall attendance ({overallPct.toFixed(2)}%) is below the required 75% minimum.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Overall Attendance"
          value={`${overallPct.toFixed(1)}%`}
          tone={belowThreshold ? "red" : overallPct >= 85 ? "green" : "amber"}
          sub={`${dash.attendance.overall.attended}/${dash.attendance.overall.totalConducted} classes`}
        />
        <Stat label="Total Fees" value={`₹${fees?.totalObligation.toFixed(2) ?? 0}`} tone="blue" />
        <Stat
          label="Pending Balance"
          value={`₹${fees?.pending.toFixed(2) ?? 0}`}
          tone={(fees?.pending ?? 0) > 0 ? "red" : "green"}
        />
      </div>

      <Card title="Subject-wise Attendance">
        {dash.attendance.bySubject.length === 0 ? (
          <p className="text-sm text-slate-400">No attendance records yet.</p>
        ) : (
          <Table
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Subject" },
              { key: "pct", label: "Percentage" },
              { key: "status", label: "Status" },
            ]}
            rows={dash.attendance.bySubject.map((s) => ({
              code: s.subjectCode,
              name: s.subjectName,
              pct: `${s.percentage.toFixed(2)}%`,
              status: s.belowThreshold ? <Badge tone="red">Below 75%</Badge> : <Badge tone="green">OK</Badge>,
            }))}
            empty="No attendance records"
          />
        )}
      </Card>

      <Card title="Academic Performance">
        {!marks || marks.summary.length === 0 ? (
          <p className="text-sm text-slate-400">No marks published yet.</p>
        ) : (
          <Table
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Subject" },
              { key: "pct", label: "Percentage" },
              { key: "assessments", label: "Assessments" },
            ]}
            rows={marks.summary.map((s) => ({
              code: s.subjectCode,
              name: s.subjectName,
              pct: (
                <Badge tone={s.percentage >= 60 ? "green" : s.percentage >= 40 ? "amber" : "red"}>
                  {s.percentage.toFixed(2)}%
                </Badge>
              ),
              assessments: s.assessments,
            }))}
            empty="No marks yet"
          />
        )}
      </Card>
    </div>
  );
}
