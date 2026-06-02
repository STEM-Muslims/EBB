import { useAdmin } from "../../hooks/useAdmin";

export default function DashboardPage() {
  const { email, loading, logout } = useAdmin();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Education Beyond Borders — Admin</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-red-600 transition"
          >
            Sign out
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
