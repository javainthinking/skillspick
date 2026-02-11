"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { eq } from "drizzle-orm";

function kebab(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

type Parsed = {
  owner: string;
  repo: string;
  ref?: string; // branch/tag/sha
  path?: string; // file or dir path
  kind: "root" | "tree" | "blob";
};

function parseGitHubUrlLoose(input: string): Parsed | null {
  try {
    const u = new URL(input.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/i, "");

    if (parts.length === 2) return { owner, repo, kind: "root" };

    if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
      const kind = parts[2] as "tree" | "blob";
      const ref = parts[3]!;
      const path = parts.slice(4).join("/");
      return { owner, repo, ref, path, kind };
    }

    return null;
  } catch {
    return null;
  }
}

function dirname(p: string) {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

async function getDefaultBranch(owner: string, repo: string): Promise<string | null> {
  // Unauthed GitHub API is rate-limited; fallback to main.
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "User-Agent": "pickskill-import",
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { default_branch?: string };
    return json.default_branch ?? null;
  } catch {
    return null;
  }
}

function canonicalTreeUrl(owner: string, repo: string, ref: string, dir: string) {
  const base = `https://github.com/${owner}/${repo}/tree/${ref}`;
  return dir ? `${base}/${dir}` : base;
}

function rawSkillMdUrl(owner: string, repo: string, ref: string, dir: string) {
  const p = dir ? `${dir}/SKILL.md` : "SKILL.md";
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${p}`;
}

function extractNameAndDescriptionFromSkillMd(md: string, fallbackName: string): { name: string; description: string } {
  const lines = md.split(/\r?\n/);

  // Name: first H1
  let name: string | null = null;
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) {
      name = m[1]!.trim();
      break;
    }
  }

  // Description: first non-empty paragraph after name
  let description = "";
  const startIdx = name
    ? Math.max(
        0,
        lines.findIndex((l) => l.match(/^#\s+/)),
      )
    : 0;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (!l) continue;
    if (l.startsWith("#")) continue;
    description = l.replace(/^[-*]\s+/, "");
    break;
  }

  return {
    name: (name && name.length <= 120 ? name : null) ?? fallbackName,
    description: description.slice(0, 300),
  };
}

const ImportState = z.object({ error: z.string().optional() });
export type ImportState = z.infer<typeof ImportState>;

export async function importFromGithub(prev: ImportState, formData: FormData): Promise<ImportState> {
  const url = String(formData.get("githubUrl") ?? "").trim();
  if (!url) return { error: "Please paste a GitHub URL." };

  const parsed = parseGitHubUrlLoose(url);
  if (!parsed) return { error: "Unsupported URL. Please use a GitHub repo/tree/blob URL." };

  const owner = parsed.owner;
  const repo = parsed.repo;

  const ref = parsed.ref ?? (await getDefaultBranch(owner, repo)) ?? "main";

  // We import a *folder*.
  const dir = (() => {
    const p = (parsed.path ?? "").replace(/^\/+/, "").replace(/\/+$/, "");
    if (!p) return "";

    if (parsed.kind === "tree") return p;

    // blob: if it's a file, use its directory. If it's already a dir, keep it.
    const looksFile = /\.[A-Za-z0-9]+$/.test(p);
    return looksFile ? dirname(p) : p;
  })();

  const sourceUrl = canonicalTreeUrl(owner, repo, ref, dir);
  const repoUrl = `https://github.com/${owner}/${repo}`;

  const db = getDb();

  // If already imported (same GitHub folder), redirect to existing.
  const existing = await db.select().from(skills).where(eq(skills.sourceUrl, sourceUrl)).limit(1);
  if (existing[0]) {
    redirect(`/s/${existing[0].slug}`);
  }

  const skillMdRes = await fetch(rawSkillMdUrl(owner, repo, ref, dir), {
    next: { revalidate: 60 * 10 },
  });

  if (!skillMdRes.ok) {
    return { error: "Detect failed: SKILL.md not found at that URL (or repo is private)." };
  }

  const skillMd = await skillMdRes.text();
  if (!skillMd.trim()) {
    return { error: "Detect failed: SKILL.md is empty." };
  }

  const baseName = `${owner}/${repo}`;
  const extracted = extractNameAndDescriptionFromSkillMd(skillMd, baseName);

  const baseSlug = kebab(`${owner}-${repo}`);

  // Resolve slug collisions.
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const conflict = await db.select({ id: skills.id }).from(skills).where(eq(skills.slug, slug)).limit(1);
    if (!conflict[0]) break;
    slug = `${baseSlug}-${i}`;
  }

  const inserted = await db
    .insert(skills)
    .values({
      name: extracted.name,
      slug,
      description: extracted.description,
      repoUrl,
      sourceUrl,
      readmeMarkdown: skillMd,
      stars: 0,
    })
    .returning({ slug: skills.slug });

  const finalSlug = inserted[0]?.slug ?? slug;
  redirect(`/s/${finalSlug}`);
}
