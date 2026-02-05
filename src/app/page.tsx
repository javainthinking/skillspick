import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc, ilike, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();

  const db = getDb();

  const rows = q
    ? await db
        .select()
        .from(skills)
        .where(
          or(
            ilike(skills.name, `%${q}%`),
            ilike(skills.slug, `%${q}%`),
            ilike(skills.description, `%${q}%`),
            ilike(skills.repoUrl, `%${q}%`),
            ilike(skills.homepageUrl, `%${q}%`),
            ilike(skills.sourceUrl, `%${q}%`),
          ),
        )
        .orderBy(desc(skills.stars), desc(skills.lastSeenAt))
        .limit(50)
    : await db.select().from(skills).orderBy(desc(skills.lastSeenAt)).limit(12);

  return (
    <main className="min-h-screen">
      {/* background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(168,85,247,0.20),transparent_45%),radial-gradient(900px_circle_at_80%_30%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(900px_circle_at_50%_90%,rgba(236,72,153,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-14">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold tracking-tight text-white/90">
              <span className="font-semibold tracking-tight">Skills</span>
              <span className="ml-1 font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-indigo-400 to-cyan-300">
                Pick
              </span>
            </div>
            <div className="mt-1 text-sm text-white/50">Search & discover AI agent skills.</div>
          </div>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur hover:bg-white/10"
            href="https://clawhub.ai/skills"
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="https://clawhub.ai/clawd-logo.png"
              alt="ClawHub"
              className="h-5 w-5 rounded-md bg-white/5 p-0.5"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span>ClawHub</span>
            <span className="text-white/50">↗</span>
          </a>
        </header>

        <section className="mt-10">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Find the right <span className="font-black">skill</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base text-white/60">
            Type a keyword to search by name, slug, description, repo, homepage, or source URL.
          </p>

          <form method="GET" className="mt-6">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search skills (e.g. memory, github, slack, vercel)"
                className="w-full bg-transparent px-3 py-3 text-base text-white/90 outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-gradient-to-b from-fuchsia-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.25)] hover:opacity-95"
              >
                Search
              </button>
            </div>
            {q ? (
              <div className="mt-3 text-sm text-white/50">
                Showing top {rows.length} results for <span className="text-white/80">“{q}”</span>
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/50">Try: memory, github, vercel, slack, notion</div>
            )}
          </form>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div className="text-sm font-medium text-white/70">
              {q ? "Results" : "Recently seen"}
            </div>
            {q ? (
              <Link href="/" className="text-sm text-white/50 hover:text-white/70">
                Clear
              </Link>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map((s) => (
              <Link
                key={s.id}
                href={`/s/${s.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{s.name}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-white/55">{s.description || ""}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">⭐ {s.stars ?? 0}</span>
                      <span className="truncate">/{s.slug}</span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
                    ↗
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {q && rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No results. Try a shorter keyword.
            </div>
          ) : null}
        </section>

        <footer className="mt-14 text-xs text-white/35">
          Data sources: ClawHub + Awesome lists.
        </footer>
      </div>
    </main>
  );
}
