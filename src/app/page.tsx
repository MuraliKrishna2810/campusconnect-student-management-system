"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui";

export default function Home() {
  const { me, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/login");
    else if (me.role === "STAFF") router.replace("/staff");
    else if (me.role === "STUDENT") router.replace("/student");
    else router.replace("/parent");
  }, [loading, me, router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner label="Redirecting…" />
    </div>
  );
}
