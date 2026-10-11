"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";

export function Protect({
  roles,
  children,
}: {
  roles: Array<"STAFF" | "STUDENT" | "PARENT">;
  children: React.ReactNode;
}) {
  const { me, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) router.replace("/login");
    else if (!loading && me && !roles.includes(me.role)) router.replace("/unauthorized");
  }, [loading, me, roles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner label="Checking session…" />
      </div>
    );
  }
  if (!me || !roles.includes(me.role)) return null;
  return <>{children}</>;
}
