import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getDb();
  const recent = await db.select().from(skills).orderBy(desc(skills.lastSeenAt)).limit(30);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">SkillsPick</div>
            <div className="mt-1 text-sm text-white/60">Search & discover AI Agent Skills. Fast. Minimal. SEO-friendly.</div>
          </div>
          <a
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            href="https://clawhub.com"
            target="_blank"
            rel="noreferrer"
          >
            Browse Clawhub
          </a>
        </div>

        <div className="mt-8">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6">
            <div className="text-lg font-semibold">Start typing</div>
            <div className="mt-1 text-sm text-white/60">(search UI next) — meanwhile, here are recently seen skills</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recent.map((s) => (
            <Link
              key={s.id}
              href={`/s/${s.slug}`}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-white/60">{s.description || ""}</div>
                </div>
                <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
                  ↗
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-xs text-white/40">
          Data sources: Clawhub + Awesome lists. Updated via ingest.
        </div>
      </div>
    </main>
  );
}
