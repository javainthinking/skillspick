import Link from "next/link";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { and, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import type { Metadata } from "next";
import SkillCard from "@/app/_components/SkillCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recommended skills | PickSkill",
  description: "Highlighted (recommended) skills.",
  alternates: { canonical: "/recommended" },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecommendedPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();

  const db = getDb();

  const whereBase = and(eq(skills.highlighted, true), isNotNull(skills.highlightedAt));

  const rowsPromise = q
    ? db
        .select()
        .from(skills)
        .where(
          and(
            whereBase,
            or(
              ilike(skills.name, `%${q}%`),
              ilike(skills.slug, `%${q}%`),
              ilike(skills.description, `%${q}%`),
              ilike(skills.repoUrl, `%${q}%`),
              ilike(skills.homepageUrl, `%${q}%`),
              ilike(skills.sourceUrl, `%${q}%`),
            ),
          ),
        )
        .orderBy(desc(skills.highlightedAt), desc(skills.stars))
        .limit(80)
    : db.select().from(skills).where(whereBase).orderBy(desc(skills.highlightedAt), desc(skills.stars)).limit(60);

  const rows = await rowsPromise;

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_500px_at_10%_20%,rgba(99,102,241,0.16),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="mt-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Recommended</h1>
              <div className="mt-2 text-sm text-white/55">Highlighted skills curated by admin.</div>
            </div>

            <form method="GET" className="w-full sm:max-w-md">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] p-2 backdrop-blur">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search recommended skills"
                  className="w-full bg-transparent px-4 py-2 text-sm text-white/90 outline-none placeholder:text-white/35"
                />
                <button type="submit" className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">
                  Search
                </button>
              </div>
              {q ? (
                <div className="mt-2 text-xs text-white/50">
                  Filtering by <span className="text-white/75">“{q}”</span> ·{" "}
                  <Link href="/recommended" className="underline underline-offset-4 hover:text-white/70">
                    Clear
                  </Link>
                </div>
              ) : null}
            </form>
          </div>

          {rows.length ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((s) => (
                <SkillCard key={s.id} s={s} highlightedBadge />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">No recommended skills yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
