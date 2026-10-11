"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Table, Badge, Spinner, Alert } from "@/components/ui";

interface AttendanceSummary {
  overall: { totalConducted: number; attended: number; percentage: number };
  bySubject: Array<{
    subjectCode: string;
    subjectName: string;
    totalConducted: number;
    attended: number;
    percentage: number;
    belowThreshold: boolean;
  }>;
}

export default function StudentAttendancePage() {
  const [att, setAtt] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ ok: boolean; data: AttendanceSummary }>("/api/attendance/me")
      .then((r) => setAtt(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!att) return null;

  const warnings = att.bySubject.filter((s) => s.belowThreshold);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>

      {warnings.length > 0 ? (
        <Alert tone="red">
          ⚠ You have low attendance in {warnings.length} subject(s): {warnings.map((w) => w.subjectCode).join(", ")}
        </Alert>
      ) : null}

      <Card title="Overall Attendance">
        <div className="text-4xl font-bold text-slate-900">
          {att.overall.percentage.toFixed(2)}%
        </div>
        <div className="text-sm text-slate-500 mt-1">
          {att.overall.attended} attended out of {att.overall.totalConducted} classes conducted
        </div>
      </Card>

      <Card title="Subject-wise Breakdown">
        <Table
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Subject" },
            { key: "attended", label: "Attended" },
            { key: "total", label: "Total" },
            { key: "pct", label: "Percentage" },
            { key: "status", label: "Status" },
          ]}
          rows={att.bySubject.map((s) => ({
            code: s.subjectCode,
            name: s.subjectName,
            attended: s.attended,
            total: s.totalConducted,
            pct: `${s.percentage.toFixed(2)}%`,
            status: s.belowThreshold ? (
              <Badge tone="red">Below 75%</Badge>
            ) : (
              <Badge tone="green">OK</Badge>
            ),
          }))}
          empty="No attendance records yet"
        />
      </Card>
    </div>
  );
}
