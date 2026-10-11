"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button, Input, Label, Card, Alert } from "@/components/ui";

export default function LoginPage() {
  const { login, me } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    const target = me.role === "STAFF" ? "/staff" : me.role === "STUDENT" ? "/student" : "/parent";
    router.replace(target);
  }, [me, router]);

  if (me) {
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      const target = res.role === "STAFF" ? "/staff" : res.role === "STUDENT" ? "/student" : "/parent";
      router.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function seedDemo() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      setSeedMsg("Demo data loaded. You can now log in with the credentials shown below.");
      setEmail("admin@campus.local");
      setPassword("staff123");
    } catch (err) {
      setSeedMsg(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold text-slate-900">CampusConnect</h1>
          <p className="text-sm text-slate-500 mt-1">Student Management System</p>
        </div>
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label required>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.local"
                autoFocus
                required
              />
            </div>
            <div>
              <Label required>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error ? <Alert tone="red">{error}</Alert> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">
              First time here? Load demo data to explore all three portals.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={seedDemo}
              disabled={seeding}
              className="w-full"
            >
              {seeding ? "Loading demo data…" : "Load demo data"}
            </Button>
            {seedMsg ? (
              <div className="mt-3">
                <Alert tone="green">{seedMsg}</Alert>
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div><strong>Staff:</strong> admin@campus.local / staff123</div>
                  <div><strong>Student:</strong> alice@campus.local / student123</div>
                  <div><strong>Parent:</strong> parent.alice@campus.local / parent123</div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
        <p className="text-center text-xs text-slate-400 mt-6">
          Secure authentication · Role-based access · Attendance warnings
        </p>
      </div>
    </div>
  );
}
