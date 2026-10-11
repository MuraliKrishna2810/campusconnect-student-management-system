"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Spinner, Badge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface Child {
  studentId: number;
  fullName: string;
  admissionNumber: string;
  email: string;
  className: string | null;
  semester: number | null;
  departmentName: string | null;
  relation: string;
}

export default function ParentPage() {
  const { me } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ ok: boolean; data: { items: Child[] } }>("/api/parents/me/children")
      .then((r) => setChildren(r.data.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parent Portal</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome, {me?.displayName}</p>
      </div>

      <Card title="My Children">
        {children.length === 0 ? (
          <p className="text-sm text-slate-400">No children linked to your account.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((c) => (
              <Link
                key={c.studentId}
                href={`/parent/${c.studentId}`}
                className="block p-5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                    👤
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{c.fullName}</div>
                    <div className="text-xs text-slate-500">{c.admissionNumber}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <div>
                    <Badge tone="violet">{c.relation}</Badge>
                  </div>
                  {c.className ? (
                    <div>
                      {c.departmentName} · {c.className} · Sem {c.semester}
                    </div>
                  ) : null}
                  <div className="text-xs text-slate-400">{c.email}</div>
                </div>
                <div className="mt-3 text-sm text-blue-600 font-medium">View details →</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
