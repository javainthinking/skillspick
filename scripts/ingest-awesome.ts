import { fetchText } from "../src/lib/github";
import { upsertSkill } from "../src/lib/ingest";

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
  {
    kind: "github_list",
    name: "ComposioHQ/awesome-claude-skills",
    url: "https://github.com/ComposioHQ/awesome-claude-skills",
    owner: "ComposioHQ",
    repo: "awesome-claude-skills",
    path: "README.md",
  },
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

async function main() {
  for (const src of SOURCES) {
    const raw = await fetchText(`https://raw.githubusercontent.com/${src.owner}/${src.repo}/${src.ref ?? "main"}/${src.path}`);

    const links = extractMarkdownLinks(raw)
      .filter((l) => looksLikeRepo(l.url))
      .slice(0, 4000);

    for (const l of links) {
      const repoUrl = normalizeRepoUrl(l.url);
      const name = l.text.trim();
      const description = "";

      // Basic heuristics: many awesome lists have `- [name](repo) - desc`.
      const m = l.line.match(/\)\s*[-–—:]\s*(.+)$/);
      const desc = m?.[1]?.trim();

      await upsertSkill(
        {
          name,
          description: desc || description,
          repoUrl,
          sourceUrl: src.url,
        },
        { kind: src.kind, name: src.name, url: src.url }
      );
    }

    console.log(`Ingested ${links.length} links from ${src.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
