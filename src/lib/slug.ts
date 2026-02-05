export function slugifySkillName(name: string) {
  return name
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildSkillSlug(name: string, repoUrl?: string | null) {
  const base = slugifySkillName(name) || "skill";
  if (!repoUrl) return base;

  // Add a short, stable suffix to reduce collisions.
  const suffix = simpleHash(repoUrl).slice(0, 6);
  return `${base}-${suffix}`;
}

function simpleHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
