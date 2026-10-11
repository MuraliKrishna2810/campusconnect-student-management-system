"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Stat, Spinner, Alert, Badge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface AttendanceSummary {
  overall: { totalConducted: number; attended: number; percentage: number };
  bySubject: Array<{ subjectCode: string; subjectName: string; percentage: number; belowThreshold: boolean }>;
}

interface FeeData {
  totalObligation: number;
  totalPaid: number;
  pending: number;
}

export default function StudentDashboard() {
  const { me } = useAuth();
  const [att, setAtt] = useState<AttendanceSummary | null>(null);
  const [fees, setFees] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ ok: boolean; data: AttendanceSummary }>("/api/attendance/me"),
      apiGet<{ ok: boolean; data: FeeData }>("/api/fees/me"),
    ])
      .then(([a, f]) => {
        setAtt(a.data);
        setFees(f.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const overallPct = att?.overall.percentage ?? 0;
  const belowThreshold = overallPct > 0 && overallPct < 75;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome, {me?.displayName}</p>
        {me?.student?.className ? (
          <p className="text-xs text-slate-400 mt-1">
            {me.student.departmentName} · {me.student.className} · Sem {me.student.semester}
          </p>
        ) : null}
      </div>

      {belowThreshold ? (
        <Alert tone="red">
          ⚠ Your overall attendance ({overallPct.toFixed(2)}%) is below the required 75% minimum. Please contact your
          class coordinator.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Overall Attendance"
          value={`${overallPct.toFixed(1)}%`}
          tone={belowThreshold ? "red" : overallPct >= 85 ? "green" : "amber"}
          sub={`${att?.overall.attended}/${att?.overall.totalConducted} classes`}
        />
        <Stat label="Total Fees" value={`₹${fees?.totalObligation.toFixed(2) ?? 0}`} tone="blue" />
        <Stat
          label="Pending Balance"
          value={`₹${fees?.pending.toFixed(2) ?? 0}`}
          tone={(fees?.pending ?? 0) > 0 ? "red" : "green"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Quick Links">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/student/attendance" className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-medium">My Attendance</div>
            </Link>
            <Link href="/student/marks" className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center">
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm font-medium">My Marks</div>
            </Link>
            <Link href="/student/fees" className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm font-medium">My Fees</div>
            </Link>
            <Link href="/student/announcements" className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center">
              <div className="text-2xl mb-1">📣</div>
              <div className="text-sm font-medium">Announcements</div>
            </Link>
          </div>
        </Card>

        <Card title="Subject-wise Attendance">
          {!att || att.bySubject.length === 0 ? (
            <p className="text-sm text-slate-400">No attendance records yet.</p>
          ) : (
            <ul className="space-y-2">
              {att.bySubject.map((s) => (
                <li key={s.subjectCode} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-sm font-medium">{s.subjectName}</div>
                    <div className="text-xs text-slate-500">{s.subjectCode}</div>
                  </div>
                  <Badge tone={s.belowThreshold ? "red" : s.percentage >= 85 ? "green" : "amber"}>
                    {s.percentage.toFixed(1)}%
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
