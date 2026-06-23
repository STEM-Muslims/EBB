import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "../../api/users";
import { API_URL } from "../../config";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem("admin_token", res.access_token);
      window.location.href = "/admin";
    } catch (err: any) {
      setLocalError(err.message || "Invalid email or password");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md flex flex-col gap-8">
        <div className="text-center mt-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide uppercase">
            Education Beyond Borders
          </p>
        </div>

        {(urlError === "AccessDenied" || localError) && (
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <p className="text-sm text-red-600 text-center font-medium">
              {localError ||
                "Your account is not authorised. Contact the project lead to request access."}
            </p>
          </div>
        )}

        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 ml-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 ml-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 text-white rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">
            or continue with
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <div className="mb-2">
          <a
            href={`${API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow transition-all duration-200 active:scale-[0.98]"
          >
            <GoogleIcon />
            Sign in with Google
          </a>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.6 39.5 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"
      />
    </svg>
  );
}
