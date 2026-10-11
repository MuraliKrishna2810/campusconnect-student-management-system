"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { Card, Stat, Table, Badge, Spinner, Alert } from "@/components/ui";

interface FeeData {
  obligations: Array<{
    id: number;
    feeType: string;
    amount: number;
    dueDate: string;
    academicPeriod: string;
  }>;
  payments: Array<{
    id: number;
    obligationId: number;
    amount: number;
    paymentReference: string;
    paidAt: string;
    reversed: boolean;
  }>;
  totalObligation: number;
  totalPaid: number;
  pending: number;
  overdue: number[];
}

export default function StudentFeesPage() {
  const [data, setData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ ok: boolean; data: FeeData }>("/api/fees/me")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const paidForOblig = (obligationId: number) =>
    data.payments
      .filter((p) => p.obligationId === obligationId && !p.reversed)
      .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Fees</h1>

      {data.pending > 0 ? (
        <Alert tone="amber">
          You have a pending balance of ₹{data.pending.toFixed(2)}. Please clear dues at the accounts office.
        </Alert>
      ) : (
        <Alert tone="green">All fees are up to date. Thank you!</Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total Obligation" value={`₹${data.totalObligation.toFixed(2)}`} tone="blue" />
        <Stat label="Total Paid" value={`₹${data.totalPaid.toFixed(2)}`} tone="green" />
        <Stat label="Pending" value={`₹${data.pending.toFixed(2)}`} tone={data.pending > 0 ? "red" : "green"} />
      </div>

      <Card title="Fee Obligations">
        <Table
          columns={[
            { key: "type", label: "Type" },
            { key: "period", label: "Period" },
            { key: "amount", label: "Amount" },
            { key: "due", label: "Due Date" },
            { key: "paid", label: "Paid" },
            { key: "status", label: "Status" },
          ]}
          rows={data.obligations.map((o) => {
            const paid = paidForOblig(o.id);
            const pending = o.amount - paid;
            const overdue = data.overdue.includes(o.id) && pending > 0;
            return {
              type: <Badge tone="blue">{o.feeType}</Badge>,
              period: o.academicPeriod,
              amount: `₹${o.amount.toFixed(2)}`,
              due: o.dueDate,
              paid: `₹${paid.toFixed(2)}`,
              status: pending === 0 ? (
                <Badge tone="green">Paid</Badge>
              ) : overdue ? (
                <Badge tone="red">Overdue</Badge>
              ) : (
                <Badge tone="amber">Pending</Badge>
              ),
            };
          })}
          empty="No fee obligations"
        />
      </Card>

      <Card title="Payment History">
        <Table
          columns={[
            { key: "ref", label: "Reference" },
            { key: "amount", label: "Amount" },
            { key: "paidAt", label: "Paid At" },
            { key: "status", label: "Status" },
          ]}
          rows={data.payments.map((p) => ({
            ref: p.paymentReference,
            amount: `₹${p.amount.toFixed(2)}`,
            paidAt: new Date(p.paidAt).toLocaleString(),
            status: p.reversed ? <Badge tone="slate">Reversed</Badge> : <Badge tone="green">Valid</Badge>,
          }))}
          empty="No payments recorded"
        />
      </Card>
    </div>
  );
}
