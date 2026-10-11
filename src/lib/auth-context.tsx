"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "@/lib/client";

type Role = "STAFF" | "STUDENT" | "PARENT";

interface Me {
  userId: number;
  email: string;
  role: Role;
  displayName: string;
  student?: {
    id: number;
    admissionNumber: string;
    fullName: string;
    classSectionId: number | null;
    className: string | null;
    semester: number | null;
    departmentName: string | null;
  };
  parent?: { id: number; fullName: string };
  staff?: { id: number; employeeId: string; designation: string };
}

interface AuthContextValue {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Me>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<{ ok: boolean; data: Me }>("/api/auth/me");
      setMe(data.data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiPost<{ ok: boolean; data: Me }>("/api/auth/login", {
      email,
      password,
    });
    await refresh();
    return data.data;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/auth/logout");
    } finally {
      setMe(null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, []);

  const value = useMemo(
    () => ({ me, loading, login, logout, refresh }),
    [me, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
