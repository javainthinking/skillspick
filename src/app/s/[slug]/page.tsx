import Link from "next/link";
import { getDb } from "@/db";
import { skills, skillSources, sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {s.repoUrl ? (
            <a
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"
              href={s.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              <img src="/brands/github.svg" alt="GitHub" className="h-4 w-4 opacity-80 group-hover:opacity-100" />
              <span>GitHub</span>
            </a>
          ) : null}

          {s.homepageUrl ? (
            <a
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"
              href={s.homepageUrl}
              target="_blank"
              rel="noreferrer"
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

          {/* Back-compat: keep legacy single sourceUrl if present and no sources join data */}
          {s.sourceUrl && sourceRows.length === 0 ? (
            <a
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10"
              href={s.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="text-white/60 group-hover:text-white/80">Source</span>
              <span className="text-white/40">↗</span>
            </a>
          ) : null}
        </div>

        {s.readmeMarkdown ? (
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
