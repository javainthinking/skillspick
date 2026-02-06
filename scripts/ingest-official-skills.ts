import { fetchJson } from "../src/lib/github";
import { upsertSkill } from "../src/lib/ingest";
import { getDb } from "../src/db";
import { ingestState } from "../src/db/schema";
import { and, eq } from "drizzle-orm";

type ContentsItem = {
  type: "file" | "dir" | string;
  name: string;
  path: string;
  html_url?: string;
};

type TreeSource = {
  kind: "github_tree";
  name: string; // unique
  url: string; // canonical page
  owner: string;
  repo: string;
  dirPath: string; // repo-relative
  ref?: string;
};

const SOURCES: TreeSource[] = [
  {
    kind: "github_tree",
    name: "openai/skills:skills/.curated",
    url: "https://github.com/openai/skills/tree/main/skills/.curated",
    owner: "openai",
    repo: "skills",
    dirPath: "skills/.curated",
    ref: "main",
  },
  {
    kind: "github_tree",
    name: "anthropics/skills:skills",
    url: "https://github.com/anthropics/skills/tree/main/skills",
    owner: "anthropics",
    repo: "skills",
    dirPath: "skills",
    ref: "main",
  },
  {
    kind: "github_tree",
    name: "google-labs-code/stitch-skills:skills",
    url: "https://github.com/google-labs-code/stitch-skills/tree/main/skills",
    owner: "google-labs-code",
    repo: "stitch-skills",
    dirPath: "skills",
    ref: "main",
  },
];

async function getState(db: ReturnType<typeof getDb>, src: TreeSource) {
  const rows = await db
    .select()
    .from(ingestState)
    .where(and(eq(ingestState.sourceKind, src.kind), eq(ingestState.sourceName, src.name)))
    .limit(1);
  return rows[0] ?? null;
}

async function setState(
  db: ReturnType<typeof getDb>,
  src: TreeSource,
  patch: Partial<{ cursor: string | null; upsertedTotal: number; done: number; pageNo: number }>,
) {
  const existing = await getState(db, src);
  const now = new Date();

  if (!existing) {
    await db.insert(ingestState).values({
      sourceKind: src.kind,
      sourceName: src.name,
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

async function listDir(src: TreeSource): Promise<ContentsItem[]> {
  const ref = src.ref ?? "main";
  const url = `https://api.github.com/repos/${src.owner}/${src.repo}/contents/${src.dirPath}?ref=${encodeURIComponent(ref)}`;
  const json = await fetchJson<unknown>(url, {
    headers: {
      // GitHub wants this for REST v3.
      accept: "application/vnd.github+json",
    },
  });
  return Array.isArray(json) ? (json as ContentsItem[]) : [];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  if (!process.env.GITHUB_TOKEN) {
    console.warn("[official] WARN: GITHUB_TOKEN not set; you may hit GitHub rate limits");
  }

  const db = getDb();

  // Batch controls (avoid long runs)
  const MAX_DIRS = Number.parseInt(process.env.MAX_DIRS ?? "50", 10);

  for (const src of SOURCES) {
    const state = await getState(db, src);
    if (state?.done) {
      console.log(`[official] ${src.name}: already done`);
      continue;
    }

    const items = await listDir(src);
    const dirs = items.filter((i) => i.type === "dir" && i.html_url);

    const start = Math.max(0, Number.parseInt(state?.cursor ?? "0", 10) || 0);

    console.log(`[official] ${src.name}: dirs=${dirs.length} start=${start} maxDirsThisRun=${MAX_DIRS}`);

    let processed = 0;
    for (let i = start; i < dirs.length; i += 1) {
      if (processed >= MAX_DIRS) {
        console.log(`[official] ${src.name}: reached MAX_DIRS=${MAX_DIRS}; checkpoint saved; exiting`);
        break;
      }

      const d = dirs[i]!;
      const entryUrl = d.html_url!;
      const repoUrl = `https://github.com/${src.owner}/${src.repo}`;

      await upsertSkill(
        {
          name: d.name,
          description: "",
          repoUrl,
          sourceUrl: entryUrl,
        },
        { kind: src.kind, name: src.name, url: src.url },
      );

      processed += 1;
      if (processed % 25 === 0) console.log(`[official] ${src.name}: processed ${processed}`);

      await setState(db, src, {
        cursor: String(i + 1),
        upsertedTotal: (state?.upsertedTotal ?? 0) + processed,
        pageNo: 0,
        done: 0,
      });
    }

    const finished = start + processed >= dirs.length;
    if (finished) {
      await setState(db, src, {
        cursor: String(dirs.length),
        done: 1,
      });
      console.log(`[official] ${src.name}: done`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
