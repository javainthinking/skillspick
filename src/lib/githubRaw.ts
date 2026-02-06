type GitHubRef = {
  owner: string;
  repo: string;
  ref: string;
  // file path within repo (no leading slash). Empty means repo root.
  path: string;
  kind: "root" | "blob" | "tree";
};

export function parseGitHubUrl(url: string): GitHubRef | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0]!;
    const repo = parts[1]!;

    // Repo root: /owner/repo
    if (parts.length === 2) {
      return { owner, repo, ref: "main", path: "", kind: "root" };
    }

    // /owner/repo/blob/<ref>/<path...>
    // /owner/repo/tree/<ref>/<path...>
    if (parts.length >= 4 && (parts[2] === "blob" || parts[2] === "tree")) {
      const kind = parts[2] as "blob" | "tree";
      const ref = parts[3]!;
      const rest = parts.slice(4);
      const path = rest.join("/");
      return { owner, repo, ref, path, kind };
    }

    return null;
  } catch {
    return null;
  }
}

export function toRawUrl(ref: { owner: string; repo: string; ref: string; path: string }): string {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.ref}/${ref.path}`;
}

export function docCandidatesFromEntryUrl(entryUrl: string): Array<{ label: string; rawUrl: string }> {
  const parsed = parseGitHubUrl(entryUrl);
  if (!parsed) return [];

  // If entry points to a file, try in its directory.
  // If entry points to a directory (tree) or root, try in that directory.
  const baseDir = (() => {
    if (!parsed.path) return "";

    // If it's likely a file path, use its directory.
    const isFile = /\.[A-Za-z0-9]+$/.test(parsed.path);
    if (isFile) {
      const idx = parsed.path.lastIndexOf("/");
      return idx >= 0 ? parsed.path.slice(0, idx) : "";
    }

    // Otherwise assume directory.
    return parsed.path;
  })();

  const join = (dir: string, file: string) => (dir ? `${dir}/${file}` : file);

  const files = ["README.md", "SKILL.md", "AGENTS.md"];
  return files.map((label) => ({
    label,
    rawUrl: toRawUrl({ owner: parsed.owner, repo: parsed.repo, ref: parsed.ref, path: join(baseDir, label) }),
  }));
}
