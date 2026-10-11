"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Table, Badge, Spinner } from "@/components/ui";

interface Log {
  id: number;
  recipientEmail: string;
  recipientRole: string;
  subject: string;
  status: string;
  failureReason: string | null;
  sentAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ ok: boolean; data: { items: Log[] } }>("/api/notification-logs").then((r) => {
      setLogs(r.data.items);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Notification Logs</h1>
      <Card>
        {loading ? (
          <Spinner />
        ) : (
          <Table
            columns={[
              { key: "sentAt", label: "Sent At" },
              { key: "recipient", label: "Recipient" },
              { key: "role", label: "Role" },
              { key: "subject", label: "Subject" },
              { key: "status", label: "Status" },
              { key: "failure", label: "Failure" },
            ]}
            rows={logs.map((l) => ({
              sentAt: new Date(l.sentAt).toLocaleString(),
              recipient: l.recipientEmail,
              role: <Badge tone="violet">{l.recipientRole}</Badge>,
              subject: l.subject,
              status: l.status === "sent" ? <Badge tone="green">Sent</Badge> : <Badge tone="red">Failed</Badge>,
              failure: l.failureReason || "—",
            }))}
            empty="No notifications sent yet"
          />
        )}
      </Card>
    </div>
  );
}
