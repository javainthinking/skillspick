import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc, ilike, or, sql, and, eq, isNotNull } from "drizzle-orm";
import SkillCard from "@/app/_components/SkillCard";
import OpenAILogo from "@/app/_components/OpenAILogo";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PickSkill",
  description:
    "Search and discover AI agent skills. Fast. Minimal. SEO-friendly.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PickSkill",
    description:
      "Search and discover AI agent skills. Fast. Minimal. SEO-friendly.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PickSkill",
    description:
      "Search and discover AI agent skills. Fast. Minimal. SEO-friendly.",
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

  const highlightedPromise = db
    .select()
    .from(skills)
    .where(and(eq(skills.highlighted, true), isNotNull(skills.highlightedAt)))
    .orderBy(desc(skills.highlightedAt), desc(skills.stars))
    .limit(12);

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

  const [rows, totalSkills, highlighted] = await Promise.all([
    rowsPromise,
    totalSkillsPromise,
    highlightedPromise,
  ]);

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
        target:
          (process.env.SITE_URL || "https://pickskill.ai") +
          "/?q={search_term_string}",
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
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="mx-auto flex min-h-[56vh] max-w-4xl flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-6xl font-[var(--font-display)]">
            <span className="font-medium text-[color:var(--ui-fg)]">Pick</span>
            <span className="ml-2 bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-cyan-200 bg-clip-text font-black text-transparent drop-shadow-[0_0_22px_rgba(168,85,247,0.25)] dark:inline hidden">
              Skill
            </span>
            <span className="ml-2 font-black text-[color:var(--foreground)] dark:hidden inline">
              Skill
            </span>
          </h1>
          <div className="mt-3 text-base leading-relaxed text-[color:var(--ui-fg-muted)]">
            A minimal search engine for AI agent skills.
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 text-sm text-[color:var(--ui-fg-muted)] backdrop-blur">
              <span className="text-[color:var(--ui-fg-faint)]">Total</span>
              <span className="font-semibold text-[color:var(--ui-fg)]">
                {Intl.NumberFormat().format(totalSkills)}
              </span>
              <span className="text-[color:var(--ui-fg-faint)]">
                skills indexed
              </span>
            </div>
          </div>

          <form method="GET" className="mt-9 w-full">
            <div className="group relative flex w-full items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] p-2 shadow-[0_16px_70px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-[color:var(--ui-border-strong)] focus-within:border-[color:var(--ui-border-strong)]">
              <div className="pointer-events-none absolute -inset-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-indigo-500/20 to-cyan-400/20 opacity-0 blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100" />
              <div className="relative flex w-full items-center gap-2">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search skills"
                  className="w-full bg-transparent px-5 py-3.5 text-lg text-[color:var(--ui-fg)] outline-none placeholder:text-[color:var(--ui-fg-faint)]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-[color:var(--ui-fg-muted)]">
              {q ? (
                <>
                  Showing top {rows.length} results for{" "}
                  <span className="text-[color:var(--ui-fg)]">“{q}”</span> ·{" "}
                  <Link
                    href="/"
                    className="underline underline-offset-4 hover:text-[color:var(--foreground)]"
                  >
                    Clear
                  </Link>
                </>
              ) : (
                <>Try: memory, github, vercel, slack</>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-[color:var(--ui-fg-muted)]">
              <div className="mr-1 text-[11px] uppercase tracking-wider text-[color:var(--ui-fg-faint)]">
                Works with
              </div>

              <a
                href="https://cursor.com"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img
                  src="/brands/cursor.ico"
                  alt="Cursor"
                  className="h-4 w-4 opacity-80 group-hover:opacity-100"
                />
                <span className="text-[color:var(--ui-fg)]">Cursor</span>
                <span className="text-[color:var(--ui-fg-faint)]">IDE</span>
              </a>

              <a
                href="https://claude.ai"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img
                  src="/brands/claude.ico"
                  alt="Claude"
                  className="h-4 w-4 opacity-80 group-hover:opacity-100"
                />
                <span className="text-[color:var(--ui-fg)]">Claude</span>
                <span className="text-[color:var(--ui-fg-faint)]">LLM</span>
              </a>

              <a
                href="https://openai.com/codex"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <OpenAILogo className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span className="text-[color:var(--ui-fg)]">Codex</span>
                <span className="text-[color:var(--ui-fg-faint)]">OpenAI</span>
              </a>

              <a
                href="https://openclaw.ai"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img
                  src="/brands/openclaw.svg"
                  alt="OpenClaw"
                  className="h-4 w-4 opacity-80 group-hover:opacity-100"
                />
                <span className="text-[color:var(--ui-fg)]">OpenClaw</span>
                <span className="text-[color:var(--ui-fg-faint)]">Agents</span>
              </a>

              <a
                href="https://manus.im"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img
                  src="/brands/manus-64.png"
                  alt="Manus"
                  className="h-4 w-4 rounded opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <span className="text-[color:var(--ui-fg)]">Manus</span>
                <span className="text-[color:var(--ui-fg-faint)]">agent</span>
              </a>

              <a
                href="https://antigravity.google"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img
                  src="/brands/antigravity.png"
                  alt="Antigravity"
                  className="h-4 w-4 opacity-85 group-hover:opacity-100"
                  loading="lazy"
                />
                <span className="text-[color:var(--ui-fg)]">Antigravity</span>
                <span className="text-[color:var(--ui-fg-faint)]">tools</span>
              </a>
            </div>
          </form>
        </section>

        <section className="mx-auto max-w-7xl pb-14">
          {!q && highlighted.length ? (
            <div className="mb-10">
              <div className="mb-3 text-sm font-medium uppercase tracking-wider text-white/35">
                Recommended
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {highlighted.map((s) => (
                  <SkillCard key={s.id} s={s} highlightedBadge />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-3 text-sm font-medium uppercase tracking-wider text-white/35">
            {q ? "Results" : "Recently seen"}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((s) => (
              <SkillCard key={s.id} s={s} />
            ))}
          </div>

          {q && rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No results. Try a shorter keyword.
            </div>
          ) : null}

          <div className="mt-14 border-t border-white/10 pt-10">
            <div className="text-xs font-medium uppercase tracking-wider text-white/35">
              FAQ
            </div>
            <div className="mt-4 space-y-2">
              {faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-5 py-4 open:bg-[color:var(--ui-bg-hover)]"
                >
                  <summary className="cursor-pointer list-none select-none text-sm font-semibold text-[color:var(--ui-fg)]">
                    <span className="mr-2 text-[color:var(--ui-fg-faint)] group-open:hidden">
                      +
                    </span>
                    <span className="mr-2 text-[color:var(--ui-fg-faint)] hidden group-open:inline">
                      −
                    </span>
                    {item.q}
                  </summary>
                  <div className="mt-3 text-sm leading-relaxed text-[color:var(--ui-fg-muted)]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <footer className="mt-12 text-center text-sm text-white/30">
            Data sources: ClawHub + Awesome lists.
          </footer>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </main>
  );
}
