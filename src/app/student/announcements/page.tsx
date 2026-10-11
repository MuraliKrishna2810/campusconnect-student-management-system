"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Spinner, Badge } from "@/components/ui";

interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
}

export default function StudentAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ ok: boolean; data: { items: Announcement[] } }>("/api/announcements")
      .then((r) => setItems(r.data.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">No announcements yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{a.title}</h3>
                <Badge tone="violet">{a.audience}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{a.body}</p>
              <div className="text-xs text-slate-500 mt-2">{new Date(a.createdAt).toLocaleString()}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
