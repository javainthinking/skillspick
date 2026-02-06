import { getDb, resetDb } from "@/db";
import { eq, ilike } from "drizzle-orm";
import { skillSources, skills, sources } from "@/db/schema";
import { buildSkillSlug } from "@/lib/slug";

export type IngestSkill = {
  name: string;
  description?: string;
  repoUrl?: string;
  homepageUrl?: string;
  sourceUrl?: string;
  stars?: number;
  readmeMarkdown?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientDbError(err: unknown) {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = (e?.code ?? e?.cause?.code) as string | undefined;
  return code === "CONNECTION_CLOSED" || code === "ECONNRESET";
}

async function upsertSource(input: { kind: string; name: string; url: string }) {
  const db = getDb();
  const existing = await db.select().from(sources).where(eq(sources.url, input.url)).limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db
    .insert(sources)
    .values({ kind: input.kind, name: input.name, url: input.url })
    .returning();
  return inserted[0]!;
}

async function findSkillByRepo(db: ReturnType<typeof getDb>, repoUrl?: string) {
  if (!repoUrl) return null;
  const existing = await db.select().from(skills).where(eq(skills.repoUrl, repoUrl)).limit(1);
  return existing[0] ?? null;
}

async function findSkillBySlug(db: ReturnType<typeof getDb>, slug: string) {
  const existing = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
  return existing[0] ?? null;
}

export async function upsertSkill(skill: IngestSkill, source: { kind: string; name: string; url: string }) {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const db = getDb();
      const src = await upsertSource(source);

      const byRepo = await findSkillByRepo(db, skill.repoUrl);
      if (byRepo) {
        await db
          .update(skills)
          .set({
            name: skill.name || byRepo.name,
            description: skill.description ?? byRepo.description,
            homepageUrl: skill.homepageUrl ?? byRepo.homepageUrl,
            sourceUrl: skill.sourceUrl ?? byRepo.sourceUrl,
            stars: skill.stars ?? byRepo.stars,
            readmeMarkdown: skill.readmeMarkdown ?? byRepo.readmeMarkdown,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(skills.id, byRepo.id));

        await db
          .insert(skillSources)
          .values({ skillId: byRepo.id, sourceId: src.id })
          .onConflictDoNothing();

        return byRepo;
      }

      // Fallback: match by very similar name (avoid dupes for missing repo urls).
      const maybe = await db
        .select()
        .from(skills)
        .where(ilike(skills.name, skill.name))
        .limit(1);

      if (maybe[0]) {
        const m = maybe[0];
        await db
          .update(skills)
          .set({
            description: skill.description ?? m.description,
            homepageUrl: skill.homepageUrl ?? m.homepageUrl,
            repoUrl: skill.repoUrl ?? m.repoUrl,
            sourceUrl: skill.sourceUrl ?? m.sourceUrl,
            stars: skill.stars ?? m.stars,
            readmeMarkdown: skill.readmeMarkdown ?? m.readmeMarkdown,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(skills.id, m.id));

        await db
          .insert(skillSources)
          .values({ skillId: m.id, sourceId: src.id })
          .onConflictDoNothing();

        return m;
      }

      const slug = buildSkillSlug(skill.name, skill.repoUrl ?? null);

      // Slug collisions can happen (e.g. different sources, same repo/name). Upsert on slug.
      const inserted = await db
        .insert(skills)
        .values({
          name: skill.name,
          slug,
          description: skill.description ?? "",
          homepageUrl: skill.homepageUrl,
          repoUrl: skill.repoUrl,
          sourceUrl: skill.sourceUrl,
          stars: skill.stars ?? 0,
          readmeMarkdown: skill.readmeMarkdown,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: skills.slug,
          set: {
            name: skill.name,
            description: skill.description ?? "",
            homepageUrl: skill.homepageUrl,
            repoUrl: skill.repoUrl,
            sourceUrl: skill.sourceUrl,
            stars: skill.stars ?? 0,
            readmeMarkdown: skill.readmeMarkdown,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();

      const row = inserted[0] ?? (await findSkillBySlug(db, slug));
      if (!row) throw new Error(`Failed to upsert skill for slug=${slug}`);

      await db
        .insert(skillSources)
        .values({ skillId: row.id, sourceId: src.id })
        .onConflictDoNothing();

      return row;
    } catch (err: unknown) {
      if (!isTransientDbError(err) || attempt === maxAttempts) throw err;

      // Reset the cached DB client and retry.
      resetDb();
      const backoff = 500 * attempt;
      await sleep(backoff);
    }
  }

  throw new Error("unreachable");
}
