import Link from "next/link";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-600 mt-2">
          You do not have permission to view this page. Please sign in with an account that has
          the required role.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 px-5 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
