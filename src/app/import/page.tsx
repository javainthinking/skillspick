import type { Metadata } from "next";
import Link from "next/link";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = {
  title: "Import",
  description: "Import a skill from a GitHub URL.",
  alternates: { canonical: "/import" },
};

export default function ImportPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_500px_at_10%_20%,rgba(99,102,241,0.16),transparent_55%)]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm text-white/60 hover:text-white/80">← Back</Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Import</h1>
        <p className="mt-3 text-white/65">
          Paste a GitHub URL to a repo or folder. We will detect <span className="text-white/80">SKILL.md</span> and create a new
          page.
        </p>

        <ImportForm />
      </div>
    </main>
  );
}
