"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "Dashboard", icon: "📊" },
  { href: "/staff/students", label: "Students", icon: "🎓" },
  { href: "/staff/attendance", label: "Attendance", icon: "✅" },
  { href: "/staff/marks", label: "Marks", icon: "📝" },
  { href: "/staff/fees", label: "Fees", icon: "💰" },
  { href: "/staff/announcements", label: "Announcements", icon: "📣" },
  { href: "/staff/logs", label: "Notification Logs", icon: "📬" },
];

const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "📊" },
  { href: "/student/attendance", label: "My Attendance", icon: "✅" },
  { href: "/student/marks", label: "My Marks", icon: "📝" },
  { href: "/student/fees", label: "My Fees", icon: "💰" },
  { href: "/student/announcements", label: "Announcements", icon: "📣" },
];

const PARENT_NAV: NavItem[] = [
  { href: "/parent", label: "My Children", icon: "👨‍👩‍👧" },
];

export function Sidebar() {
  const { me, logout } = useAuth();
  const pathname = usePathname();
  if (!me) return null;

  const nav =
    me.role === "STAFF" ? STAFF_NAV : me.role === "STUDENT" ? STUDENT_NAV : PARENT_NAV;

  const baseHref = me.role === "STAFF" ? "/staff" : me.role === "STUDENT" ? "/student" : "/parent";

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-slate-700">
        <div className="text-xl font-bold tracking-tight">CampusConnect</div>
        <div className="text-xs text-slate-400 mt-1">Student Management System</div>
      </div>
      <div className="px-4 py-4 text-xs text-slate-400 uppercase tracking-wider">
        {me.role} Portal
      </div>
      <nav className="flex-1 px-2">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== baseHref && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition ${
                active ? "bg-blue-700 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-1">Signed in as</div>
        <div className="text-sm font-medium truncate">{me.displayName}</div>
        <div className="text-xs text-slate-400 truncate mb-3">{me.email}</div>
        <button
          onClick={logout}
          className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
