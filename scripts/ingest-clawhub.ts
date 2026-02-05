import { upsertSkill } from "@/lib/ingest";

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

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Set it in the environment before running ingest.");
  }

  let cursor: string | null = null;
  let total = 0;
  let pageNo = 0;

  for (;;) {
    pageNo += 1;

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

    for (const it of items) {
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
      const sourceUrl = owner
        ? `https://clawhub.ai/${encodeURIComponent(owner)}/${encodeURIComponent(it.skill.slug)}`
        : `https://clawhub.ai/skills?focus=search&q=${encodeURIComponent(it.skill.slug)}`;

      await upsertSkill(
        {
          name: it.skill.displayName,
          description: it.skill.summary ?? undefined,
          homepageUrl,
          repoUrl,
          sourceUrl,
          stars: it.skill.stats?.stars ?? undefined,
        },
        {
          kind: "clawhub",
          name: "ClawHub",
          url: "https://clawhub.ai/skills",
        },
      );

      total += 1;
      if (total % 100 === 0) console.log(`[clawhub] upserted ${total}`);
    }

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
