import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const row = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
  const s = row[0];
  if (!s) return { title: "Skill not found | SkillsPick" };

  const site = process.env.SITE_URL || "https://skillspick.vercel.app";
  const url = `${site}/s/${s.slug}`;

  const title = `${s.name} | SkillsPick`;
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

  const site = process.env.SITE_URL || "https://skillspick.vercel.app";
  const url = `${site}/s/${s.slug}`;

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm text-white/60 hover:text-white">← Back</Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{s.name}</h1>
        <p className="mt-3 text-white/70">{s.description}</p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {s.repoUrl ? (
            <a className="rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10" href={s.repoUrl} target="_blank" rel="noreferrer">GitHub</a>
          ) : null}
          {s.homepageUrl ? (
            <a className="rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10" href={s.homepageUrl} target="_blank" rel="noreferrer">Homepage</a>
          ) : null}
          {s.sourceUrl ? (
            <a className="rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10" href={s.sourceUrl} target="_blank" rel="noreferrer">Source</a>
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
