"use client";

import { useState, useTransition } from "react";

export default function HighlightToggle({
  skillId,
  initialHighlighted,
}: {
  skillId: string;
  initialHighlighted: boolean;
}) {
  const [highlighted, setHighlighted] = useState(initialHighlighted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setError(null);
    setHighlighted(next);

    const res = await fetch(`/api/pickskill/admin/skills/${skillId}/highlight`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ highlighted: next }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setError(data?.error ?? "Update failed");
      // revert
      setHighlighted(!next);
      return;
    }

    startTransition(() => {
      // Keep it simple: refresh server-rendered state
      window.location.reload();
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Admin</div>
          <div className="mt-1 text-sm font-semibold text-white/80">Highlighted</div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => void toggle(!highlighted)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            highlighted
              ? "bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400 text-white"
              : "border border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
          }`}
        >
          {highlighted ? "Recommended" : "Not recommended"}
        </button>
      </div>
      {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
    </div>
  );
}
