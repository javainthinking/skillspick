import Link from "next/link";
import { getDb } from "@/db";
import { skills, skillSources, sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { githubToRawUrl } from "@/lib/githubRaw";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

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

async function fetchSkillMarkdown(entryUrl?: string | null): Promise<{ rawUrl: string; markdown: string } | null> {
  if (!entryUrl) return null;
  const rawUrl = githubToRawUrl(entryUrl);
  if (!rawUrl) return null;

  // Only fetch markdown-ish files.
  if (!/\.(md|mdx)$/i.test(rawUrl) && !/\/SKILL\.md$/i.test(rawUrl)) return null;

  const res = await fetch(rawUrl, {
    // Keep it reasonably fresh without hammering GitHub.
    next: { revalidate: 60 * 30 },
  });
  if (!res.ok) return null;
  const markdown = await res.text();
  if (!markdown.trim()) return null;
  return { rawUrl, markdown };
}

function renderMarkdownSafe(md: string): string {
  const html = marked.parse(md) as string;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "pre",
      "code",
      "blockquote",
      "hr",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      code: ["class"],
      pre: ["class"],
      '*': ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer" }),
    },
  });
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const skillDoc = await fetchSkillMarkdown(s.sourceUrl);
  const skillDocHtml = skillDoc ? renderMarkdownSafe(skillDoc.markdown) : null;

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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm text-white/60 hover:text-white/80">← Back</Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{s.name}</h1>
        <p className="mt-3 text-white/70">{s.description}</p>

        <div className="mt-6 flex flex-col gap-4">
          {/* Primary CTA: entry link */}
          {s.sourceUrl ? (
            <a
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(168,85,247,0.25)] transition hover:opacity-95"
              href={s.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={s.sourceUrl}
            >
              <span className="inline-flex items-center gap-2">
                <img src="/brands/github.svg" alt="Entry" className="h-4 w-4 opacity-95" />
                <span>Open Entry</span>
                <span className="text-white/90">↗</span>
              </span>
            </a>
          ) : null}

          {/* Secondary links */}
          <div className="flex flex-wrap gap-2 text-sm">
            {s.repoUrl ? (
              <a
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"
                href={s.repoUrl}
                target="_blank"
                rel="noreferrer"
                title={s.repoUrl}
              >
                <img src="/brands/github.svg" alt="GitHub" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                <span>Repo</span>
                <span className="text-white/40">↗</span>
              </a>
            ) : null}

            {s.homepageUrl ? (
              <a
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"
                href={s.homepageUrl}
                target="_blank"
                rel="noreferrer"
                title={s.homepageUrl}
              >
                <span className="text-white/60 group-hover:text-white">Homepage</span>
                <span className="text-white/40">↗</span>
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
              <img src="/brands/github.svg" alt="GitHub" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
            ) : (
              <span className="grid h-4 w-4 place-items-center rounded bg-white/10 text-[10px] font-semibold text-white/70">
                S
              </span>
            );

            return (
              <a
                key={src.id}
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"
                href={src.url}
                target="_blank"
                rel="noreferrer"
                title={src.name}
              >
                {icon}
                <span className="text-white/60 group-hover:text-white/80">{isClawHub ? "ClawHub" : isGitHubList ? "GitHub list" : "Source"}</span>
              </a>
            );
            })}
          </div>
        </div>

        {skillDocHtml ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white/80">SKILL.md</div>
                <div className="mt-1 text-xs text-white/45">Rendered from <a className="underline underline-offset-4 hover:text-white/70" href={skillDoc!.rawUrl} target="_blank" rel="noreferrer">GitHub raw</a></div>
              </div>
              {skillDoc?.rawUrl ? (
                <a className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/60 hover:bg-white/10" href={skillDoc.rawUrl} target="_blank" rel="noreferrer">
                  View raw ↗
                </a>
              ) : null}
            </div>

            <article
              className="prose prose-invert mt-5 max-w-none prose-headings:scroll-mt-24 prose-headings:text-white prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white prose-a:text-white/80 prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-white"
              dangerouslySetInnerHTML={{ __html: skillDocHtml }}
            />
          </div>
        ) : s.readmeMarkdown ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/80">README (raw)</div>
            <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap text-xs text-white/70">{s.readmeMarkdown}</pre>
          </div>
        ) : null}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    </main>
  );
}
