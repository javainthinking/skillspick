export function githubToRawUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;

    // Examples:
    // - https://github.com/org/repo/blob/main/path/to/file.md
    // - https://github.com/org/repo/tree/main/path/to/file.md
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 5) return null;

    const [owner, repo, kind, ref, ...rest] = parts;
    if (!owner || !repo || !ref) return null;
    if (kind !== "blob" && kind !== "tree") return null;
    if (rest.length === 0) return null;

    const path = rest.join("/");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  } catch {
    return null;
  }
}
