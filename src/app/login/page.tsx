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
        </Card>
        <p className="text-center text-xs text-slate-400 mt-6">
          Secure authentication · Role-based access · Attendance warnings
        </p>
      </div>
    </div>
  );
}
