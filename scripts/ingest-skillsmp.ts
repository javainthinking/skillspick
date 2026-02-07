import { fetchJson } from "../src/lib/github";
import { upsertSkill } from "../src/lib/ingest";
import { getDb } from "../src/db";
import { ingestState } from "../src/db/schema";
import { and, eq } from "drizzle-orm";

type SkillsMpSource = {
  kind: "skillsmp";
  name: string;
  url: string;
};

const SOURCE: SkillsMpSource = {
  kind: "skillsmp",
  name: "skillsmp.com",
  url: "https://skillsmp.com",
};

type SkillsMpSkill = Record<string, unknown>;

type Cursor = {
  qIndex: number;
  page: number;
};

function safeJsonParse<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function extractGithubUrls(obj: unknown): string[] {
  const urls: string[] = [];

  const visit = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      const m = v.match(/https?:\/\/github\.com\/[^\s)\]}>'\"]+/g);
      if (m) urls.push(...m);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (typeof v === "object") {
      for (const k of Object.keys(v)) visit(v[k]);
    }
  };

  visit(obj);

  // Normalize: drop params/fragments
  return uniq(
    urls
      .map((u) => u.split("#")[0]!.split("?")[0]!)
      .filter((u) => u.includes("github.com/")),
  );
}

function normalizeRepoAndPath(url: string): { repoUrl: string; sourceUrl: string } | null {
  // Examples:
  // - https://github.com/openclaw/openclaw/tree/main/skills/gog
  // - https://github.com/openai/skills/tree/main/skills/.curated/foo
  // - https://github.com/org/repo
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!m) return null;
  const owner = m[1]!;
  const repo = m[2]!.replace(/\.git$/, "");
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const sourceUrl = url;
  return { repoUrl, sourceUrl };
}

function pickName(skill: SkillsMpSkill, githubUrl: string | null): string {
  const title =
    skill.name ||
    skill.title ||
    skill.slug ||
    skill.id ||
    (githubUrl ? githubUrl.split("/").filter(Boolean).slice(-1)[0] : null) ||
    "unknown";
  return String(title);
}

function pickDescription(skill: SkillsMpSkill): string {
  return String(skill.description || skill.summary || skill.tagline || "");
}

async function getState(db: ReturnType<typeof getDb>) {
  const rows = await db
    .select()
    .from(ingestState)
    .where(and(eq(ingestState.sourceKind, SOURCE.kind), eq(ingestState.sourceName, SOURCE.name)))
    .limit(1);
  return rows[0] ?? null;
}

async function setState(
  db: ReturnType<typeof getDb>,
  patch: Partial<{ cursor: string | null; upsertedTotal: number; done: number; pageNo: number }>,
) {
  const existing = await getState(db);
  const now = new Date();

  if (!existing) {
    await db.insert(ingestState).values({
      sourceKind: SOURCE.kind,
      sourceName: SOURCE.name,
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

async function skillsmpSearch(params: { q: string; page: number; limit: number; sortBy?: string }) {
  if (!process.env.SKILLSMP_API_KEY) throw new Error("SKILLSMP_API_KEY is missing");

  const u = new URL("https://skillsmp.com/api/v1/skills/search");
  u.searchParams.set("q", params.q);
  u.searchParams.set("page", String(params.page));
  u.searchParams.set("limit", String(params.limit));
  if (params.sortBy) u.searchParams.set("sortBy", params.sortBy);

  // Reuse fetchJson helper (adds token support etc.), but we provide our own auth header.
  return fetchJson<unknown>(u.toString(), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.SKILLSMP_API_KEY}`,
    },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractSkillsList(json: unknown): SkillsMpSkill[] {
  if (!json) return [];

  // Try common shapes
  if (Array.isArray(json)) return json as SkillsMpSkill[];

  if (!isRecord(json)) return [];

  const skills = json["skills"];
  if (Array.isArray(skills)) return skills as SkillsMpSkill[];

  const data = json["data"];
  if (Array.isArray(data)) return data as SkillsMpSkill[];
  if (isRecord(data) && Array.isArray(data["skills"])) return data["skills"] as SkillsMpSkill[];

  const result = json["result"];
  if (Array.isArray(result)) return result as SkillsMpSkill[];
  if (isRecord(result) && Array.isArray(result["skills"])) return result["skills"] as SkillsMpSkill[];

  return [];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  if (!process.env.SKILLSMP_API_KEY) {
    console.warn("[skillsmp] WARN: SKILLSMP_API_KEY not set; cannot access SkillsMP API");
  }

  const db = getDb();

  // Controls
  const LIMIT = Number.parseInt(process.env.LIMIT ?? "100", 10);
  const MAX_PAGES_PER_Q = Number.parseInt(process.env.MAX_PAGES_PER_Q ?? "50", 10);
  const MAX_ITEMS = Number.parseInt(process.env.MAX_ITEMS ?? "5000", 10);

  // Query plan: cover common tokens to approximate a full crawl.
  const QUERIES = (
    process.env.QUERIES?.split(",").map((s) => s.trim()).filter(Boolean) ??
    [
      ..."abcdefghijklmnopqrstuvwxyz".split(""),
      ..."0123456789".split(""),
      "-",
      "_",
      "api",
      "tool",
      "skill",
    ]
  ).filter(Boolean);

  const state = await getState(db);
  if (state?.done) {
    console.log("[skillsmp] already done");
    return;
  }

  const cursor = safeJsonParse<Cursor>(state?.cursor) ?? { qIndex: 0, page: 1 };
  let upserted = state?.upsertedTotal ?? 0;

  console.log(
    `[skillsmp] starting qIndex=${cursor.qIndex} page=${cursor.page} queries=${QUERIES.length} limit=${LIMIT} maxPagesPerQ=${MAX_PAGES_PER_Q}`,
  );

  outer: for (let qi = cursor.qIndex; qi < QUERIES.length; qi += 1) {
    const q = QUERIES[qi]!;
    const startPage = qi === cursor.qIndex ? cursor.page : 1;

    for (let page = startPage; page <= MAX_PAGES_PER_Q; page += 1) {
      const json = await skillsmpSearch({ q, page, limit: LIMIT, sortBy: "recent" });
      const skills = extractSkillsList(json);

      console.log(`[skillsmp] q='${q}' page=${page} got=${skills.length}`);

      if (!skills.length) {
        // No more results for this q.
        break;
      }

      for (const s of skills) {
        const githubUrls = extractGithubUrls(s);
        const gh = githubUrls.find((u) => u.includes("github.com/")) ?? null;
        const norm = gh ? normalizeRepoAndPath(gh) : null;
        if (!norm) continue;

        await upsertSkill(
          {
            name: pickName(s, gh),
            description: pickDescription(s),
            repoUrl: norm.repoUrl,
            sourceUrl: norm.sourceUrl,
          },
          SOURCE,
        );

        upserted += 1;
        if (upserted % 100 === 0) console.log(`[skillsmp] upserted=${upserted}`);
        if (upserted >= MAX_ITEMS) {
          console.log(`[skillsmp] reached MAX_ITEMS=${MAX_ITEMS}; stopping`);
          await setState(db, {
            // Resume from the *next* page for this query.
            cursor: JSON.stringify({ qIndex: qi, page: page + 1 }),
            upsertedTotal: upserted,
            done: 0,
          });
          return; // stop early without marking done
        
        }
      }

      await setState(db, {
        cursor: JSON.stringify({ qIndex: qi, page: page + 1 }),
        upsertedTotal: upserted,
        done: 0,
      });
    }

    // next q
    await setState(db, {
      cursor: JSON.stringify({ qIndex: qi + 1, page: 1 }),
      upsertedTotal: upserted,
      done: 0,
    });
  }

  await setState(db, {
    cursor: JSON.stringify({ qIndex: QUERIES.length, page: 1 }),
    upsertedTotal: upserted,
    done: 1,
  });

  console.log(`[skillsmp] done. total upserted=${upserted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
