"use client";

import { useActionState } from "react";
import { importFromGithub, type ImportState } from "./actions";

const initialState: ImportState = {};

export function ImportForm() {
  const [state, action, pending] = useActionState(importFromGithub, initialState);

  return (
    <form action={action} className="mt-8">
      <label className="block text-sm font-medium text-white/70">GitHub URL</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          name="githubUrl"
          placeholder="https://github.com/owner/repo/tree/main/path"
          className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-white/30"
          autoComplete="off"
          inputMode="url"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </div>

      {state?.error ? (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      <div className="mt-4 text-xs leading-relaxed text-white/45">
        We detect skills by fetching <span className="text-white/60">SKILL.md</span> from the linked folder.
      </div>
    </form>
  );
}
