"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/client";
import { Card, Button, Input, Label, Select, Table, Badge, Spinner, Modal, Alert } from "@/components/ui";

interface Student {
  id: number;
  admissionNumber: string;
  fullName: string;
  email: string;
  className: string | null;
  semester: number | null;
  departmentName: string | null;
  active: boolean;
}

interface ClassSection {
  id: number;
  name: string;
  semester: number;
  departmentName: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [search, classFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (classFilter) params.set("classSectionId", classFilter);
      const [studentsRes, classesRes] = await Promise.all([
        apiGet<{ ok: boolean; data: { items: Student[] } }>(`/api/students?${params}`),
        apiGet<{ ok: boolean; data: { items: ClassSection[] } }>("/api/classes"),
      ]);
      setStudents(studentsRes.data.items);
      setClasses(classesRes.data.items);
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this student?")) return;
    try {
      await apiDelete(`/api/students/${id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <Button onClick={() => setShowAddModal(true)}>+ Add Student</Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <Input
            placeholder="Search by name, admission number, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="md:w-64">
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.departmentName}
              </option>
            ))}
          </Select>
        </div>

        {error ? <Alert tone="red">{error}</Alert> : null}

        {loading ? (
          <Spinner />
        ) : (
          <Table
            columns={[
              { key: "admissionNumber", label: "Admission No" },
              { key: "fullName", label: "Name" },
              { key: "email", label: "Email" },
              { key: "class", label: "Class" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={students.map((s) => ({
              admissionNumber: s.admissionNumber,
              fullName: s.fullName,
              email: s.email,
              class: s.className || "—",
              status: s.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>,
              actions: s.active ? (
                <Button variant="ghost" onClick={() => deactivate(s.id)}>
                  Deactivate
                </Button>
              ) : null,
            }))}
            empty="No students found"
          />
        )}
      </Card>

      {showAddModal ? <AddStudentModal classes={classes} onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); load(); }} /> : null}
    </div>
  );
}

function AddStudentModal({
  classes,
  onClose,
  onAdded,
}: {
  classes: ClassSection[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    admissionNumber: "",
    password: "student123",
    classSectionId: "",
    gender: "Male",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/students", {
        ...form,
        classSectionId: form.classSectionId ? Number(form.classSectionId) : null,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add New Student">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label required>Full Name</Label>
          <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </div>
        <div>
          <Label required>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <Label required>Admission Number</Label>
          <Input value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} required />
        </div>
        <div>
          <Label required>Initial Password</Label>
          <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <Label>Class</Label>
          <Select value={form.classSectionId} onChange={(e) => setForm({ ...form, classSectionId: e.target.value })}>
            <option value="">— None —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.departmentName}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Gender</Label>
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </Select>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        {error ? <Alert tone="red">{error}</Alert> : null}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add Student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
