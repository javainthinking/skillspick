import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc, ilike, or, sql } from "drizzle-orm";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PickSkill",
  description: "Search and discover AI agent skills. Fast. Minimal. SEO-friendly.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PickSkill",
    description: "Search and discover AI agent skills. Fast. Minimal. SEO-friendly.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PickSkill",
    description: "Search and discover AI agent skills. Fast. Minimal. SEO-friendly.",
  },
};

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

  const faq = [
    {
      q: "What is an agent skill?",
      a: "An agent skill is a reusable capability an AI agent can call—usually a tool integration (API/CLI), a workflow, or a best-practice prompt pattern packaged for repeatable use.",
    },
    {
      q: "How do I choose the right skill?",
      a: "Start from the job-to-be-done (e.g. GitHub PRs, calendar, CRM, ETL). Prefer skills with clear inputs/outputs, good docs, and minimal required secrets.",
    },
    {
      q: "What are typical real-world patterns for agent skills?",
      a: "Common patterns include: (1) retrieval + tool (search then act), (2) ingestion + indexing, (3) scheduled checks + notifications, (4) human-in-the-loop approvals for risky actions, and (5) structured outputs (JSON) for reliability.",
    },
    {
      q: "How do I evaluate if a skill works well?",
      a: "Use small, repeatable test cases. Check correctness, latency, and failure modes. Add logging/telemetry and explicit error handling. For high-impact flows, add automated evals.",
    },
    {
      q: "Is it safe to give skills access to my accounts?",
      a: "Treat skills like code you run. Use least privilege, rotate tokens, and keep high-risk actions behind confirmations. Prefer scoped API tokens over full-account credentials.",
    },
    {
      q: "What is the best way to avoid agent hallucinations?",
      a: "Force tool use for facts, keep prompts small, require citations/links, and validate outputs (schemas, unit tests, or checkers). Don’t rely on free-form text for critical steps.",
    },
    {
      q: "Can I publish my own skill?",
      a: "Yes—package a clear interface (inputs/outputs), include docs + examples, and describe required secrets. Make sure it fails safely and is easy to install.",
    },
    {
      q: "How often is the index updated?",
      a: "PickSkill is updated via ingest from multiple sources. Some sources update continuously; others update in batches.",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PickSkill",
      url: (process.env.SITE_URL || "https://pickskill.ai") + "/",
      potentialAction: {
        "@type": "SearchAction",
        target: (process.env.SITE_URL || "https://pickskill.ai") + "/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_500px_at_10%_20%,rgba(99,102,241,0.16),transparent_55%)]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="flex items-center justify-end" />

        <section className="mx-auto flex min-h-[56vh] max-w-2xl flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl font-[var(--font-display)]">
            <span className="font-medium text-white/90">Pick</span>
            <span className="ml-2 bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-cyan-200 bg-clip-text font-black text-transparent drop-shadow-[0_0_22px_rgba(168,85,247,0.25)]">
              Skill
            </span>
          </h1>
          <div className="mt-3 text-base leading-relaxed text-white/55">
            A minimal search engine for AI agent skills.
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/60 backdrop-blur">
              <span className="text-white/35">Total</span>
              <span className="font-semibold text-white/75">{Intl.NumberFormat().format(totalSkills)}</span>
              <span className="text-white/35">skills indexed</span>
            </div>
          </div>

          <form method="GET" className="mt-9 w-full">
            <div className="group relative flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] p-2 shadow-[0_16px_70px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-white/25 focus-within:border-white/30">
              <div className="pointer-events-none absolute -inset-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-indigo-500/20 to-cyan-400/20 opacity-0 blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100" />
              <div className="relative flex w-full items-center gap-2">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search skills"
                  className="w-full bg-transparent px-5 py-3.5 text-lg text-white/90 outline-none placeholder:text-white/35"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-white/50">
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
                href="https://openai.com/codex"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img src="/brands/openai.svg" alt="OpenAI" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span className="text-white/60 group-hover:text-white/80">Codex</span>
                <span className="text-white/35">OpenAI</span>
              </a>

              <a
                href="https://openclaw.ai"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img src="/brands/openclaw.svg" alt="OpenClaw" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span className="text-white/60 group-hover:text-white/80">OpenClaw</span>
                <span className="text-white/35">Agents</span>
              </a>

              <a
                href="https://manus.im"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img
                  src="/brands/manus-64.png"
                  alt="Manus"
                  className="h-4 w-4 rounded opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <span className="text-white/60 group-hover:text-white/80">Manus</span>
                <span className="text-white/35">agent</span>
              </a>

              <a
                href="https://antigravity.google"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur hover:border-white/20 hover:bg-white/[0.06]"
              >
                <img
                  src="/brands/antigravity.png"
                  alt="Antigravity"
                  className="h-4 w-4 opacity-85 group-hover:opacity-100"
                  loading="lazy"
                />
                <span className="text-white/60 group-hover:text-white/80">Antigravity</span>
                <span className="text-white/35">tools</span>
              </a>
            </div>
          </form>
        </section>

        <section className="mx-auto max-w-3xl pb-14">
          <div className="mb-3 text-sm font-medium uppercase tracking-wider text-white/35">
            {q ? "Results" : "Recently seen"}
          </div>

          <div className="space-y-4">
            {rows.map((s) => {
              const sourceKind = s.sourceUrl?.includes("clawhub.ai") ? "clawhub" : s.repoUrl?.includes("github.com") ? "github" : null;
              const sourceLabel = sourceKind === "clawhub" ? "ClawHub" : sourceKind === "github" ? "GitHub" : null;
              const sourceIcon =
                sourceKind === "clawhub" ? (
                  <img
                    src="https://clawhub.ai/clawd-logo.png"
                    alt="ClawHub"
                    className="h-4 w-4 rounded bg-white/5 p-0.5 opacity-90"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : sourceKind === "github" ? (
                  <img src="/brands/github.svg" alt="GitHub" className="h-4 w-4 opacity-85" />
                ) : null;

              return (
                <Link
                  key={s.id}
                  href={`/s/${s.slug}`}
                  className="group block rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-lg font-semibold text-white transition group-hover:text-white">{s.name}</div>
                    {sourceLabel ? (
                      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55 transition group-hover:border-white/20 group-hover:bg-white/10">
                        {sourceIcon}
                        <span>{sourceLabel}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 line-clamp-2 text-base leading-relaxed text-white/60">{s.description || ""}</div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/45">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 transition group-hover:border-white/15 group-hover:bg-white/10">/{s.slug}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 transition group-hover:border-white/15 group-hover:bg-white/10">⭐ {s.stars ?? 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {q && rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No results. Try a shorter keyword.
            </div>
          ) : null}

          <div className="mt-14 border-t border-white/10 pt-10">
            <div className="text-xs font-medium uppercase tracking-wider text-white/35">FAQ</div>
            <div className="mt-4 space-y-2">
              {faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 open:bg-white/[0.06]"
                >
                  <summary className="cursor-pointer list-none select-none text-sm font-semibold text-white">
                    <span className="mr-2 text-white/40 group-open:hidden">+</span>
                    <span className="mr-2 text-white/40 hidden group-open:inline">−</span>
                    {item.q}
                  </summary>
                  <div className="mt-3 text-sm leading-relaxed text-white/60">{item.a}</div>
                </details>
              ))}
            </div>
          </div>

          <footer className="mt-12 text-center text-sm text-white/30">
            Data sources: ClawHub + Awesome lists.
          </footer>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    </main>
  );
}
