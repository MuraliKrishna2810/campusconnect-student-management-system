"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Stat, Spinner, Table, Badge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface DashboardData {
  totalStudents: number;
  activeStudents: number;
  lowAttendanceCount: number;
  pendingFeesCount: number;
  recentSessions: Array<{ id: number; sessionDate: string; subjectName: string; className: string }>;
  recentAnnouncements: Array<{ id: number; title: string; createdAt: string }>;
}

export default function StaffDashboard() {
  const { me } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const studentsRes = await apiGet<{ ok: boolean; data: { items: unknown[]; total: number } }>("/api/students?active=true");
        const sessionsRes = await apiGet<{ ok: boolean; data: { items: unknown[] } }>("/api/attendance/sessions");
        const announcementsRes = await apiGet<{ ok: boolean; data: { items: unknown[] } }>("/api/announcements");
        const feesRes = await apiGet<{ ok: boolean; data: { items: unknown[] } }>("/api/fees?overdue=true");

        setData({
          totalStudents: studentsRes.data.total,
          activeStudents: studentsRes.data.total,
          lowAttendanceCount: 0, // Would need per-student calculation
          pendingFeesCount: feesRes.data.items.length,
          recentSessions: sessionsRes.data.items.slice(0, 5) as DashboardData["recentSessions"],
          recentAnnouncements: announcementsRes.data.items.slice(0, 5) as DashboardData["recentAnnouncements"],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back, {me?.displayName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Students" value={data.totalStudents} tone="blue" />
        <Stat label="Active Students" value={data.activeStudents} tone="green" />
        <Stat label="Low Attendance" value={data.lowAttendanceCount} tone="amber" sub="Below 75%" />
        <Stat label="Overdue Fees" value={data.pendingFeesCount} tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/staff/students"
              className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center"
            >
              <div className="text-2xl mb-1">🎓</div>
              <div className="text-sm font-medium">Manage Students</div>
            </Link>
            <Link
              href="/staff/attendance"
              className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center"
            >
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-medium">Mark Attendance</div>
            </Link>
            <Link
              href="/staff/marks"
              className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center"
            >
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm font-medium">Enter Marks</div>
            </Link>
            <Link
              href="/staff/fees"
              className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center"
            >
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm font-medium">Manage Fees</div>
            </Link>
          </div>
        </Card>

        <Card title="Recent Attendance Sessions">
          <Table
            columns={[
              { key: "date", label: "Date" },
              { key: "subject", label: "Subject" },
              { key: "class", label: "Class" },
            ]}
            rows={data.recentSessions.map((s) => ({
              date: s.sessionDate,
              subject: <Badge tone="blue">{s.subjectName}</Badge>,
              class: s.className,
            }))}
            empty="No sessions yet"
          />
        </Card>
      </div>

      <Card title="Recent Announcements">
        {data.recentAnnouncements.length === 0 ? (
          <p className="text-sm text-slate-400">No announcements yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.recentAnnouncements.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="font-medium text-slate-800">{a.title}</div>
                <div className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
