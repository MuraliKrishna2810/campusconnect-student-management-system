"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import { Card, Button, Input, Label, Textarea, Alert, Badge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const { me } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "green" | "red" } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await apiGet<{ ok: boolean; data: { items: Announcement[] } }>("/api/announcements");
    setItems(res.data.items);
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiPost("/api/announcements", { ...form, audience: "ALL" });
      setForm({ title: "", body: "" });
      setMsg({ text: "Announcement published", tone: "green" });
      load();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", tone: "red" });
    } finally {
      setBusy(false);
    }
  }

  const isStaff = me?.role === "STAFF";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>

      {isStaff ? (
        <Card title="Publish New Announcement">
          <form onSubmit={publish} className="space-y-3">
            <div>
              <Label required>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label required>Body</Label>
              <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </div>
            {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Publish"}
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">No announcements yet.</p>
          </Card>
        ) : (
          items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  <div className="text-xs text-slate-500 mt-1">
                    <Badge tone="violet">{a.audience}</Badge>{" "}
                    <span className="ml-2">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{a.body}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
