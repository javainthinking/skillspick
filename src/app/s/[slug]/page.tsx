import Link from "next/link";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { skills, skillSources, sources } from "@/db/schema";
import HighlightToggle from "@/app/_components/HighlightToggle";
import { verifyAdminCookieValue } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { docCandidatesFromEntryUrl } from "@/lib/githubRaw";
import GithubSlugger from "github-slugger";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const row = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
  const s = row[0];
  if (!s) return { title: "Skill not found | PickSkill" };

  const site = process.env.SITE_URL || "https://pickskill.ai";
  const url = `${site}/s/${s.slug}`;

  const title = `${s.name}`;
  const description = (s.description || "").slice(0, 180) || `AI agent skill: ${s.name}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

async function fetchBestDoc(entryUrl?: string | null): Promise<{ rawUrl: string; markdown: string; label: string } | null> {
  if (!entryUrl) return null;

  const candidates = docCandidatesFromEntryUrl(entryUrl);
  if (candidates.length === 0) return null;

  for (const c of candidates) {
    const res = await fetch(c.rawUrl, {
      // Keep it reasonably fresh without hammering GitHub.
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) continue;
    const markdown = await res.text();
    if (!markdown.trim()) continue;
    return { rawUrl: c.rawUrl, markdown, label: c.label };
  }

  return null;
}

function extractHeadings(md: string, maxDepth = 3) {
  const slugger = new GithubSlugger();
  const out: Array<{ depth: number; text: string; id: string }> = [];

  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const depth = m[1]!.length;
    if (depth > maxDepth) continue;
    const text = m[2]!.trim();
    if (!text) continue;
    const id = slugger.slug(text);
    out.push({ depth, text, id });
  }

  return out;
}

async function renderMarkdownHtml(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: {
        className: ["heading-anchor"],
      },
    })
    .use(rehypePrettyCode, {
      theme: "github-dark",
      keepBackground: false,
    })
    // Conservative sanitization (we don't allow raw HTML from markdown)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(md);

  return String(file);
}

function manusImportUrl(githubUrl: string) {
  return `https://manus.im/import-skills?githubUrl=${encodeURIComponent(githubUrl)}&utm_source=nav_pickskill`;
}

function bestGithubUrlForManus(urls: Array<string | null | undefined>) {
  const gh = urls.filter((u): u is string => !!u && /github\.com\//i.test(u));
  if (!gh.length) return null;

  // Prefer a concrete folder view (tree) over repo root.
  const tree = gh.find((u) => /\/tree\//i.test(u));
  if (tree) return tree;

  // If it's a file view, it might still work for some importers, but usually Manus expects a folder.
  const blob = gh.find((u) => /\/blob\//i.test(u));
  if (blob) return blob;

  return gh[0] ?? null;
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const jar = await cookies();
  const isAdmin = verifyAdminCookieValue(jar.get("pickskill_admin")?.value);

  const { slug } = await params;
  const db = getDb();
  const row = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
  const s = row[0];
  if (!s) return notFound();

  const site = process.env.SITE_URL || "https://pickskill.ai";
  const url = `${site}/s/${s.slug}`;

  const sourceRows = await db
    .select({
      id: sources.id,
      kind: sources.kind,
      name: sources.name,
      url: sources.url,
    })
    .from(skillSources)
    .innerJoin(sources, eq(skillSources.sourceId, sources.id))
    .where(eq(skillSources.skillId, s.id));

  // Manus import works best when githubUrl points at the *skill folder* (usually a /tree/... URL).
  // So prefer the same GitHub URL we use for the primary "Open Entry" when it is a /tree/... link.
  const githubEntryUrl = bestGithubUrlForManus([s.sourceUrl, s.repoUrl]);
  const manusUrl = githubEntryUrl ? manusImportUrl(githubEntryUrl) : null;

  const skillDoc = await fetchBestDoc(s.sourceUrl);
  const toc = skillDoc ? extractHeadings(skillDoc.markdown, 3) : [];
  const skillDocHtml = skillDoc ? await renderMarkdownHtml(skillDoc.markdown) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: s.name,
    description: s.description,
    url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "All",
    sameAs: [s.repoUrl, s.homepageUrl, s.sourceUrl].filter(Boolean),
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/" className="text-sm text-[color:var(--ui-fg-muted)] hover:text-[color:var(--foreground)]">← Back</Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{s.name}</h1>
          {s.highlighted ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--ui-border)] bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/20 to-cyan-400/20 px-3 py-1 text-xs font-semibold text-[color:var(--ui-fg)]">
              Highlighted
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-[color:var(--ui-fg-muted)]">{s.description}</p>

        <div className="mt-6 flex flex-col gap-3">
          {isAdmin ? <HighlightToggle skillId={s.id} initialHighlighted={Boolean(s.highlighted)} /> : null}
          {/* Primary CTAs */}
          <div className="grid gap-2 sm:grid-cols-2">
            {s.sourceUrl ? (
              <a
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(99,102,241,0.20)] transition hover:opacity-95"
                href={s.sourceUrl}
                target="_blank"
                rel="noreferrer"
                title={s.sourceUrl}
              >
                <span className="inline-flex items-center gap-2">
                  <img src="/brands/github.svg" alt="Entry" className="hidden h-4 w-4 opacity-95 dark:block" />
                  <img src="/brands/github_light.svg" alt="Entry" className="h-4 w-4 opacity-95 dark:hidden" />
                  <span>Open Entry</span>
                  <span className="text-white/90 dark:text-white/90 text-black/60">↗</span>
                </span>
              </a>
            ) : null}

            {manusUrl ? (
              <a
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-4 py-3 text-sm font-semibold text-[color:var(--ui-fg)] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.20)]"
                href={manusUrl}
                target="_blank"
                rel="noreferrer"
                title="Run this skill in Manus"
              >
                <span className="inline-flex items-center gap-2">
                  <img src="/brands/manus-64.png" alt="Manus" className="h-4 w-4 rounded opacity-90 group-hover:opacity-100" />
                  <span>Run Skill in Manus</span>
                  <span className="text-[color:var(--ui-fg-faint)]">↗</span>
                </span>
              </a>
            ) : null}
          </div>

          {/* How to load & run skills */}
          <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ui-fg-faint)]">How to load & run skills</div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a
                href="https://code.claude.com/docs/en/skills"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 text-[color:var(--ui-fg-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img src="/brands/claude.ico" alt="Claude" className="h-4 w-4 opacity-85 group-hover:opacity-100" />
                <span>Claude Code</span>
                <span className="text-[color:var(--ui-fg-faint)]">↗</span>
              </a>

              <a
                href="https://developers.openai.com/codex/skills/"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 text-[color:var(--ui-fg-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img src="/brands/openai.svg" alt="OpenAI" className="hidden h-4 w-4 opacity-80 group-hover:opacity-100 dark:block" />
                <img src="/brands/openai_light.svg" alt="OpenAI" className="h-4 w-4 opacity-80 group-hover:opacity-100 dark:hidden" />
                <span>OpenAI Codex</span>
                <span className="text-[color:var(--ui-fg-faint)]">↗</span>
              </a>

              <a
                href="https://cursor.com/docs/context/skills"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 text-[color:var(--ui-fg-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img src="/brands/cursor.ico" alt="Cursor" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span>Cursor</span>
                <span className="text-[color:var(--ui-fg-faint)]">↗</span>
              </a>

              <a
                href="https://antigravity.google/docs/skills"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1.5 text-[color:var(--ui-fg-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
              >
                <img src="/brands/antigravity.png" alt="Antigravity" className="h-4 w-4 opacity-85 group-hover:opacity-100" loading="lazy" />
                <span>Antigravity</span>
                <span className="text-[color:var(--ui-fg-faint)]">↗</span>
              </a>
            </div>
          </div>

          {/* Secondary links */}
          <div className="flex flex-wrap gap-2 text-sm">
            {s.repoUrl ? (
              <a
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
                href={s.repoUrl}
                target="_blank"
                rel="noreferrer"
                title={s.repoUrl}
              >
                <img src="/brands/github.svg" alt="GitHub" className="hidden h-4 w-4 opacity-80 group-hover:opacity-100 dark:block" />
                <img src="/brands/github_light.svg" alt="GitHub" className="h-4 w-4 opacity-80 group-hover:opacity-100 dark:hidden" />
                <span>Repo</span>
                <span className="text-[color:var(--ui-fg-faint)]">↗</span>
              </a>
            ) : null}

            {s.homepageUrl ? (
              <a
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
                href={s.homepageUrl}
                target="_blank"
                rel="noreferrer"
                title={s.homepageUrl}
              >
                <span className="text-[color:var(--ui-fg-muted)] group-hover:text-[color:var(--foreground)]">Homepage</span>
                <span className="text-[color:var(--ui-fg-faint)]">↗</span>
              </a>
            ) : null}

            {sourceRows.map((src) => {
            const isClawHub = src.kind === "clawhub" || /clawhub\./i.test(src.url);
            const isGitHubList = src.kind === "github_list" || /github\.com/i.test(src.url);
            const icon = isClawHub ? (
              <img
                src="https://clawhub.ai/clawd-logo.png"
                alt="ClawHub"
                className="h-4 w-4 rounded bg-white/5 p-0.5 opacity-90 group-hover:opacity-100"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : isGitHubList ? (
              <>
                <img src="/brands/github.svg" alt="GitHub" className="hidden h-4 w-4 opacity-80 group-hover:opacity-100 dark:block" />
                <img src="/brands/github_light.svg" alt="GitHub" className="h-4 w-4 opacity-80 group-hover:opacity-100 dark:hidden" />
              </>
            ) : (
              <span className="grid h-4 w-4 place-items-center rounded bg-[color:var(--ui-bg-hover)] text-[10px] font-semibold text-[color:var(--ui-fg-muted)]">
                S
              </span>
            );

            return (
              <a
                key={src.id}
                className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]"
                href={src.url}
                target="_blank"
                rel="noreferrer"
                title={src.name}
              >
                {icon}
                <span className="text-[color:var(--ui-fg-muted)] group-hover:text-[color:var(--foreground)]">{isClawHub ? "ClawHub" : isGitHubList ? "GitHub list" : "Source"}</span>
              </a>
            );
            })}
          </div>
        </div>

        {skillDocHtml ? (
          <div className="mt-8 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--ui-fg)]">{skillDoc?.label ?? "Doc"}</div>
                <div className="mt-1 text-xs text-[color:var(--ui-fg-muted)]">
                  Rendered from{" "}
                  <a className="underline underline-offset-4 hover:text-[color:var(--foreground)]" href={skillDoc!.rawUrl} target="_blank" rel="noreferrer">
                    GitHub raw
                  </a>
                </div>
              </div>
              {skillDoc?.rawUrl ? (
                <a className="rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-3 py-1 text-xs text-[color:var(--ui-fg-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)]" href={skillDoc.rawUrl} target="_blank" rel="noreferrer">
                  View raw ↗
                </a>
              ) : null}
            </div>

            {toc.length ? (
              <div className="mt-5 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ui-fg-faint)]">On this page</div>
                <div className="mt-3 space-y-2 text-sm">
                  {toc.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block text-[color:var(--ui-fg-muted)] hover:text-[color:var(--foreground)] ${h.depth === 2 ? "pl-3" : h.depth >= 3 ? "pl-6" : ""}`}
                    >
                      {h.text}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <article
              className="markdown-body mt-5"
              dangerouslySetInnerHTML={{ __html: skillDocHtml }}
            />
          </div>
        ) : s.readmeMarkdown ? (
          <div className="mt-8 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] p-5">
            <div className="text-sm font-semibold text-[color:var(--ui-fg)]">README (raw)</div>
            <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap text-xs text-[color:var(--ui-fg-muted)]">{s.readmeMarkdown}</pre>
          </div>
        ) : null}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    </main>
  );
}
