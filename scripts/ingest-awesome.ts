import { fetchText } from "../src/lib/github";
import { upsertSkill } from "../src/lib/ingest";
import { getDb } from "../src/db";
import { ingestState } from "../src/db/schema";
import { and, eq } from "drizzle-orm";

type RepoSrc = {
  kind: "github_list";
  name: string;
  url: string;
  owner: string;
  repo: string;
  path: string;
  ref?: string;
};

const SOURCES: RepoSrc[] = [
  // Claude / skills
  {
    kind: "github_list",
    name: "ComposioHQ/awesome-claude-skills",
    url: "https://github.com/ComposioHQ/awesome-claude-skills",
    owner: "ComposioHQ",
    repo: "awesome-claude-skills",
    path: "README.md",
  },

  // OpenClaw + agent skills
  {
    kind: "github_list",
    name: "VoltAgent/awesome-openclaw-skills",
    url: "https://github.com/VoltAgent/awesome-openclaw-skills",
    owner: "VoltAgent",
    repo: "awesome-openclaw-skills",
    path: "README.md",
  },
  {
    kind: "github_list",
    name: "VoltAgent/awesome-agent-skills",
    url: "https://github.com/VoltAgent/awesome-agent-skills",
    owner: "VoltAgent",
    repo: "awesome-agent-skills",
    path: "README.md",
  },

  // MCP ecosystems
  {
    kind: "github_list",
    name: "punkpeye/awesome-mcp-servers",
    url: "https://github.com/punkpeye/awesome-mcp-servers",
    owner: "punkpeye",
    repo: "awesome-mcp-servers",
    path: "README.md",
  },

  // General AI agents collections
  {
    kind: "github_list",
    name: "e2b-dev/awesome-ai-agents",
    url: "https://github.com/e2b-dev/awesome-ai-agents",
    owner: "e2b-dev",
    repo: "awesome-ai-agents",
    path: "README.md",
  },
];

function extractMarkdownLinks(md: string) {
  // naive: [text](url)
  const out: Array<{ text: string; url: string; line: string }> = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  for (const line of md.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      out.push({ text: m[1]!, url: m[2]!, line });
    }
  }
  return out;
}

function looksLikeRepo(url: string) {
  return /github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(url);
}

function normalizeRepoUrl(url: string) {
  const m = url.match(/(https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
  return m ? m[1] : url;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTextWithRetry(url: string, attempts = 4) {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fetchText(url);
    } catch (e) {
      lastErr = e;
      if (i === attempts) break;
      await sleep(800 * i);
    }
  }
  throw lastErr;
}

async function getState(db: ReturnType<typeof getDb>, src: RepoSrc) {
  const rows = await db
    .select()
    .from(ingestState)
    .where(and(eq(ingestState.sourceKind, src.kind), eq(ingestState.sourceName, src.name)))
    .limit(1);
  return rows[0] ?? null;
}

async function setState(db: ReturnType<typeof getDb>, src: RepoSrc, patch: Partial<{ upsertedTotal: number; done: number }>) {
  const existing = await getState(db, src);
  const now = new Date();
  if (!existing) {
    await db.insert(ingestState).values({
      sourceKind: src.kind,
      sourceName: src.name,
      cursor: null,
      pageNo: 0,
      upsertedTotal: patch.upsertedTotal ?? 0,
      done: patch.done ?? 0,
      updatedAt: now,
    });
    return;
  }

  await db
    .update(ingestState)
    .set({
      upsertedTotal: patch.upsertedTotal ?? existing.upsertedTotal,
      done: patch.done ?? existing.done,
      updatedAt: now,
    })
    .where(eq(ingestState.id, existing.id));
}

async function getRunnerState(db: ReturnType<typeof getDb>) {
  const key: RepoSrc = {
    kind: "github_list",
    name: "awesome:runner",
    url: "https://github.com",
    owner: "",
    repo: "",
    path: "",
  };
  const s = await getState(db, key);
  const nextIndex = s?.pageNo ?? 0;
  const done = Boolean(s?.done);
  return { nextIndex, done, key, raw: s };
}

async function setRunnerState(
  db: ReturnType<typeof getDb>,
  key: RepoSrc,
  patch: Partial<{ nextIndex: number; done: number; upsertedTotal: number }>,
) {
  await setState(db, key, {
    upsertedTotal: patch.upsertedTotal,
    done: patch.done,
  });

  // store nextIndex in pageNo (cheap reuse)
  const existing = await getState(db, key);
  if (!existing) return;
  await db
    .update(ingestState)
    .set({ pageNo: patch.nextIndex ?? existing.pageNo, updatedAt: new Date() })
    .where(eq(ingestState.id, existing.id));
}

async function main() {
  const db = getDb();

  const MAX_SOURCES = Number.parseInt(process.env.MAX_SOURCES ?? "1", 10);

  console.log(`[awesome] sources=${SOURCES.length} maxSourcesThisRun=${MAX_SOURCES}`);

  const runner = await getRunnerState(db);
  if (runner.done) {
    console.log("[awesome] runner already done; nothing to do");
    return;
  }

  let idx = runner.nextIndex;
  let ran = 0;

  for (; idx < SOURCES.length; idx += 1) {
    if (ran >= MAX_SOURCES) break;

    const src = SOURCES[idx]!;
    console.log(`[awesome] fetching [${idx + 1}/${SOURCES.length}] ${src.name}`);
    ran += 1;
    const ref = src.ref ?? "main";

    const primary = `https://raw.githubusercontent.com/${src.owner}/${src.repo}/${ref}/${src.path}`;
    const fallback = `https://raw.githubusercontent.com/${src.owner}/${src.repo}/master/${src.path}`;

    const raw = await fetchTextWithRetry(primary).catch(async (err) => {
      // Fallback for repos using master as default branch.
      if (!src.ref && ref === "main") {
        return await fetchTextWithRetry(fallback);
      }
      throw err;
    });

    const links = extractMarkdownLinks(raw)
      .filter((l) => looksLikeRepo(l.url))
      .slice(0, 4000);

    for (const l of links) {
      const repoUrl = normalizeRepoUrl(l.url);
      const name = l.text.trim();

      // Basic heuristics: many awesome lists have `- [name](repo) - desc`.
      const m = l.line.match(/\)\s*[-–—:]\s*(.+)$/);
      const desc = m?.[1]?.trim();

      await upsertSkill(
        {
          name,
          description: desc || "",
          repoUrl,
          sourceUrl: src.url,
        },
        { kind: src.kind, name: src.name, url: src.url },
      );
    }

    // checkpoint for observability (per-source)
    await setState(db, src, { upsertedTotal: links.length, done: 1 });

    console.log(`Ingested ${links.length} links from ${src.name}`);

    // advance runner checkpoint after each source
    await setRunnerState(db, runner.key, { nextIndex: idx + 1, upsertedTotal: links.length, done: 0 });
  }

  // Mark runner done if we reached the end.
  if (idx >= SOURCES.length) {
    await setRunnerState(db, runner.key, { nextIndex: SOURCES.length, done: 1 });
    console.log("[awesome] done");
  } else {
    console.log(`[awesome] reached MAX_SOURCES=${MAX_SOURCES}; checkpoint saved; exiting`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
