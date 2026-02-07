import { upsertSkill } from "@/lib/ingest";
import { getDb } from "@/db";
import { ingestState } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type ConvexQueryResponse<T> =
  | { status: "success"; value: T }
  | { status: "error"; errorMessage: string; errorData?: unknown; logLines?: unknown[] };

type ClawhubSkillItem = {
  ownerHandle?: string | null;
  skill: {
    _id: string;
    slug: string;
    displayName: string;
    summary?: string | null;
    stats?: { stars?: number | null };
    updatedAt?: number;
    createdAt?: number;
  };
  latestVersion?: {
    version?: string;
    parsed?: {
      frontmatter?: Record<string, unknown>;
    };
    files?: Array<{
      path: string;
      storageId: string;
      contentType?: string;
      size?: number;
    }>;
  };
};

type PageResult = {
  page: ClawhubSkillItem[];
  isDone: boolean;
  continueCursor: string;
};

const CONVEX_DEPLOYMENT_URL = "https://wry-manatee-359.convex.cloud";
const PAGE_SIZE = 50;

function pickString(obj: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeRepoUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let u = url.trim();
  if (!u) return undefined;
  // common shorthand: owner/repo
  if (!u.includes("://") && u.includes("/") && !u.startsWith("@")) {
    u = `https://github.com/${u.replace(/^github\.com\//, "")}`;
  }
  // strip trailing .git
  u = u.replace(/\.git$/i, "");
  return u;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function convexQuery<T>(path: string, args: Record<string, unknown>): Promise<T> {
  const url = `${CONVEX_DEPLOYMENT_URL}/api/query`;

  // Convex can occasionally reset connections or time out. Retry with backoff.
  const maxAttempts = 6;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Any non-empty string is fine; used for analytics/debugging on Convex side.
          "Convex-Client": "skillspick-ingest-clawhub",
        },
        body: JSON.stringify({ path, format: "convex_encoded_json", args: [args] }),
      });

      const json = (await res.json()) as ConvexQueryResponse<T>;
      if (json.status !== "success") {
        throw new Error(`Convex query failed (${path}): ${json.errorMessage}`);
      }
      return json.value;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;

      const backoffMs = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
      console.warn(
        `[clawhub] convex query error (attempt ${attempt}/${maxAttempts}); retrying in ${backoffMs}ms`,
      );
      await sleep(backoffMs);
    }
  }

  throw lastErr;
}

async function loadState(db: ReturnType<typeof getDb>, sourceKind: string, sourceName: string) {
  const rows = await db
    .select()
    .from(ingestState)
    .where(and(eq(ingestState.sourceKind, sourceKind), eq(ingestState.sourceName, sourceName)))
    .limit(1);
  return rows[0] ?? null;
}

async function saveState(
  db: ReturnType<typeof getDb>,
  sourceKind: string,
  sourceName: string,
  patch: Partial<{ cursor: string | null; pageNo: number; upsertedTotal: number; done: number }>,
) {
  const existing = await loadState(db, sourceKind, sourceName);
  const now = new Date();
  if (!existing) {
    await db.insert(ingestState).values({
      sourceKind,
      sourceName,
      cursor: patch.cursor ?? null,
      pageNo: patch.pageNo ?? 0,
      upsertedTotal: patch.upsertedTotal ?? 0,
      done: patch.done ?? 0,
      updatedAt: now,
    });
    return;
  }

  await db
    .update(ingestState)
    .set({
      cursor: patch.cursor ?? existing.cursor,
      pageNo: patch.pageNo ?? existing.pageNo,
      upsertedTotal: patch.upsertedTotal ?? existing.upsertedTotal,
      done: patch.done ?? existing.done,
      updatedAt: now,
    })
    .where(eq(ingestState.id, existing.id));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Set it in the environment before running ingest.");
  }

  const MAX_PAGES = Number.parseInt(process.env.MAX_PAGES ?? "5", 10);
  const SOURCE_KIND = "clawhub";
  const SOURCE_NAME = "ClawHub";

  const db = getDb();
  const state = await loadState(db, SOURCE_KIND, SOURCE_NAME);

  if (state?.done) {
    console.log("[clawhub] already done; nothing to do");
    return;
  }

  let cursor: string | null = state?.cursor ?? null;
  let total = state?.upsertedTotal ?? 0;
  let pageNo = state?.pageNo ?? 0;
  let pagesRun = 0;

  for (;;) {
    if (pagesRun >= MAX_PAGES) {
      console.log(`[clawhub] reached MAX_PAGES=${MAX_PAGES}; checkpoint saved; exiting`);
      break;
    }

    pageNo += 1;
    pagesRun += 1;

    const result: PageResult = await convexQuery<PageResult>("skills:listPublicPageV2", {
      paginationOpts: {
        numItems: PAGE_SIZE,
        cursor,
      },
    });

    const items = result.page ?? [];
    if (items.length === 0) {
      console.log(`[clawhub] page ${pageNo}: 0 items`);
    } else {
      console.log(`[clawhub] page ${pageNo}: ${items.length} items`);
    }

    const WRITE_CONCURRENCY = Number.parseInt(process.env.WRITE_CONCURRENCY ?? "6", 10);

    // Process items with limited concurrency to speed up writes without overwhelming Postgres.
    for (let i = 0; i < items.length; i += WRITE_CONCURRENCY) {
      const batch = items.slice(i, i + WRITE_CONCURRENCY);

      await Promise.all(
        batch.map(async (it) => {
          const fm = it.latestVersion?.parsed?.frontmatter ?? undefined;

          const homepageUrl = pickString(fm, [
            "homepage",
            "homepageUrl",
            "home",
            "url",
            "website",
          ]);

          const repoUrl = normalizeRepoUrl(
            pickString(fm, ["repo", "repoUrl", "repository", "github", "source"]) ?? undefined,
          );

          const owner = it.ownerHandle ?? null;

          // ClawHub skill pages correspond to directories in openclaw/skills.
          // Example:
          // - https://clawhub.ai/<owner>/<slug>
          // - https://github.com/openclaw/skills/tree/main/skills/<owner>/<slug>
          const clawhubUrl = owner
            ? `https://clawhub.ai/${encodeURIComponent(owner)}/${encodeURIComponent(it.skill.slug)}`
            : `https://clawhub.ai/skills?focus=search&q=${encodeURIComponent(it.skill.slug)}`;

          const githubRepoUrl = "https://github.com/openclaw/skills";
          const githubEntryUrl = owner
            ? `https://github.com/openclaw/skills/tree/main/skills/${encodeURIComponent(owner)}/${encodeURIComponent(it.skill.slug)}`
            : undefined;

          await upsertSkill(
            {
              name: it.skill.displayName,
              description: it.skill.summary ?? undefined,
              // Keep an outward link to ClawHub.
              homepageUrl: homepageUrl ?? clawhubUrl,
              // Prefer explicit repoUrl from frontmatter; otherwise use openclaw/skills.
              repoUrl: repoUrl ?? githubRepoUrl,
              // IMPORTANT: set entryUrl to GitHub directory so the detail page can render SKILL.md/README.
              sourceUrl: githubEntryUrl ?? clawhubUrl,
              stars: it.skill.stats?.stars ?? undefined,
            },
            {
              kind: "clawhub",
              name: "ClawHub",
              url: "https://clawhub.ai/skills",
            },
          );
        }),
      );

      total += batch.length;
      if (total % 100 === 0) console.log(`[clawhub] upserted ${total}`);
    }

    // page-level checkpoint
    await saveState(db, SOURCE_KIND, SOURCE_NAME, {
      cursor: result.continueCursor ?? null,
      pageNo,
      upsertedTotal: total,
      done: result.isDone ? 1 : 0,
    });

    if (result.isDone) {
      console.log(`[clawhub] done. total upserted=${total}`);
      break;
    }

    cursor = result.continueCursor;
    if (!cursor) {
      throw new Error("No continueCursor returned but isDone=false; cannot continue pagination.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
