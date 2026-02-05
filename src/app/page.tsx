import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc, ilike, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();

  const db = getDb();

  const totalSkillsPromise = db
    .select({ value: sql<number>`count(*)` })
    .from(skills)
    .then((rows) => Number(rows[0]?.value ?? 0));

  const rowsPromise = q
    ? db
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
    : db.select().from(skills).orderBy(desc(skills.lastSeenAt)).limit(12);

  const [rows, totalSkills] = await Promise.all([rowsPromise, totalSkillsPromise]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex items-center justify-end">
          <a
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 backdrop-blur hover:bg-white/10"
            href="https://clawhub.ai/skills"
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="https://clawhub.ai/clawd-logo.png"
              alt="ClawHub"
              className="h-4 w-4 rounded bg-white/5 p-0.5"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span>ClawHub</span>
            <span className="text-white/40">↗</span>
          </a>
        </header>

        <section className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl font-[var(--font-display)]">
            <span className="font-medium text-white/90">Pick</span>
            <span className="ml-2 bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-cyan-200 bg-clip-text font-black text-transparent">
              Skill
            </span>
          </h1>
          <div className="mt-3 text-sm text-white/50">A minimal search engine for AI agent skills.</div>

          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55 backdrop-blur">
              <span className="text-white/35">Total</span>
              <span className="font-semibold text-white/75">{Intl.NumberFormat().format(totalSkills)}</span>
              <span className="text-white/35">skills indexed</span>
            </div>
          </div>

          <form method="GET" className="mt-8 w-full">
            <div className="group flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 p-2 pl-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-white/25 focus-within:border-white/30 focus-within:shadow-[0_16px_60px_rgba(168,85,247,0.10)]">
              <div className="text-white/35">⌕</div>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search skills"
                className="w-full bg-transparent py-3 text-base text-white/90 outline-none placeholder:text-white/35"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full border border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white group-focus-within:border-white/0 group-focus-within:bg-white group-focus-within:text-black"
              >
                Search
              </button>
            </div>

            <div className="mt-4 text-xs text-white/45">
              {q ? (
                <>
                  Showing top {rows.length} results for <span className="text-white/75">“{q}”</span> ·{" "}
                  <Link href="/" className="underline underline-offset-4 hover:text-white/70">
                    Clear
                  </Link>
                </>
              ) : (
                <>Try: memory, github, vercel, slack</>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/50">
              <div className="mr-1 text-[11px] uppercase tracking-wider text-white/35">Works with</div>

              <a
                href="https://cursor.com"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img src="/brands/cursor.ico" alt="Cursor" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span className="text-white/60 group-hover:text-white/80">Cursor</span>
                <span className="text-white/35">IDE</span>
              </a>

              <a
                href="https://claude.ai"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img src="/brands/claude.ico" alt="Claude" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span className="text-white/60 group-hover:text-white/80">Claude</span>
                <span className="text-white/35">LLM</span>
              </a>

              <a
                href="https://docs.openclaw.ai"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img src="/brands/openclaw.svg" alt="OpenClaw" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span className="text-white/60 group-hover:text-white/80">OpenClaw</span>
                <span className="text-white/35">Agents</span>
              </a>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur">
                <img
                  src="/brands/antigravity.png"
                  alt="Antigravity"
                  className="h-4 w-4 opacity-85"
                  loading="lazy"
                />
                <span className="text-white/60">Antigravity</span>
                <span className="text-white/35">tools</span>
              </span>
            </div>
          </form>
        </section>

        <section className="mx-auto max-w-3xl pb-14">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-white/35">
            {q ? "Results" : "Recently seen"}
          </div>

          <div className="space-y-4">
            {rows.map((s) => (
              <Link key={s.id} href={`/s/${s.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]">
                <div className="text-base font-semibold text-white">{s.name}</div>
                <div className="mt-1 line-clamp-2 text-sm text-white/55">{s.description || ""}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">/{s.slug}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">⭐ {s.stars ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>

          {q && rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No results. Try a shorter keyword.
            </div>
          ) : null}

          <footer className="mt-10 text-center text-xs text-white/30">
            Data sources: ClawHub + Awesome lists.
          </footer>
        </section>
      </div>
    </main>
  );
}
