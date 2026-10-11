"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import { Card, Button, Select, Label, Input, Table, Badge, Spinner, Alert, Modal } from "@/components/ui";

interface Student {
  id: number;
  fullName: string;
  admissionNumber: string;
}
interface FeeObligation {
  id: number;
  studentName: string;
  feeType: string;
  amount: number;
  dueDate: string;
  academicPeriod: string;
}

export default function FeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "green" | "red" } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [studentsRes, feesRes] = await Promise.all([
        apiGet<{ ok: boolean; data: { items: Student[] } }>("/api/students"),
        apiGet<{ ok: boolean; data: { items: FeeObligation[] } }>("/api/fees"),
      ]);
      setStudents(studentsRes.data.items);
      setFees(feesRes.data.items);
    } finally {
      setLoading(false);
    }
  }

  async function recordPayment(obligationId: number) {
    const amount = prompt("Payment amount:");
    const ref = prompt("Payment reference (unique):");
    if (!amount || !ref) return;
    try {
      await apiPost(`/api/fees/${obligationId}/payments`, {
        amount: Number(amount),
        paymentReference: ref,
      });
      setMsg({ text: "Payment recorded", tone: "green" });
      load();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", tone: "red" });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Fee Management</h1>
        <Button onClick={() => setShowAddModal(true)}>+ Add Fee Obligation</Button>
      </div>

      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : (
          <Table
            columns={[
              { key: "studentName", label: "Student" },
              { key: "feeType", label: "Type" },
              { key: "amount", label: "Amount" },
              { key: "dueDate", label: "Due Date" },
              { key: "period", label: "Period" },
              { key: "actions", label: "Actions" },
            ]}
            rows={fees.map((f) => ({
              studentName: f.studentName,
              feeType: <Badge tone="blue">{f.feeType}</Badge>,
              amount: `₹${f.amount.toFixed(2)}`,
              dueDate: f.dueDate,
              period: f.academicPeriod,
              actions: (
                <Button variant="secondary" onClick={() => recordPayment(f.id)}>
                  Record Payment
                </Button>
              ),
            }))}
            empty="No fee obligations"
          />
        )}
      </Card>

      {showAddModal ? <AddFeeModal students={students} onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); load(); }} /> : null}
    </div>
  );
}

function AddFeeModal({
  students,
  onClose,
  onAdded,
}: {
  students: Student[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    studentId: "",
    feeType: "Tuition",
    amount: "",
    dueDate: new Date().toISOString().slice(0, 10),
    academicPeriod: "Semester 3",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/fees", { ...form, studentId: Number(form.studentId), amount: Number(form.amount) });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Fee Obligation">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label required>Student</Label>
          <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
            <option value="">Select…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.admissionNumber})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>Fee Type</Label>
          <Input value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })} required />
        </div>
        <div>
          <Label required>Amount</Label>
          <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <Label required>Due Date</Label>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm" required />
        </div>
        <div>
          <Label required>Academic Period</Label>
          <Input value={form.academicPeriod} onChange={(e) => setForm({ ...form, academicPeriod: e.target.value })} required />
        </div>
        {error ? <Alert tone="red">{error}</Alert> : null}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
