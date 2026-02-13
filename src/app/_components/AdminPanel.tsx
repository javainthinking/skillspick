"use client";

import { useState, useTransition } from "react";

export default function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function login() {
    setError(null);
    const res = await fetch("/api/pickskill/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setError(data?.error ?? "Login failed");
      return;
    }
    startTransition(() => {
      window.location.reload();
    });
  }

  async function logout() {
    setError(null);
    await fetch("/api/pickskill/admin/logout", { method: "POST" }).catch(() => null);
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div className="w-full">
      <div className="inline-flex flex-col rounded-2xl border border-white/15 bg-white/[0.03] backdrop-blur px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-left text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white/80"
        >
          {isAdmin ? "Admin (ON)" : "Admin login"}
        </button>

        {open ? (
          <div className="mt-3 w-[280px]">
            {isAdmin ? (
              <div className="space-y-2">
                <div className="text-sm text-white/70">Logged in.</div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  disabled={pending}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/30"
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/30"
                />
                {error ? <div className="text-xs text-red-300">{error}</div> : null}
                <button
                  type="button"
                  onClick={() => void login()}
                  disabled={pending}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
