import Link from "next/link";

export default function SkillCard({
  s,
  highlightedBadge,
}: {
  s: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    stars: number | null;
    sourceUrl?: string | null;
    repoUrl?: string | null;
  };
  highlightedBadge?: boolean;
}) {
  const sourceKind = s.sourceUrl?.includes("clawhub.ai") ? "clawhub" : s.repoUrl?.includes("github.com") ? "github" : null;
  const sourceLabel = sourceKind === "clawhub" ? "ClawHub" : sourceKind === "github" ? "GitHub" : null;
  const sourceIcon =
    sourceKind === "clawhub" ? (
      <img
        src="https://clawhub.ai/clawd-logo.png"
        alt="ClawHub"
        className="h-4 w-4 rounded bg-white/5 p-0.5 opacity-90"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : sourceKind === "github" ? (
      <img src="/brands/github.svg" alt="GitHub" className="h-4 w-4 opacity-85" />
    ) : null;

  return (
    <Link
      key={s.id}
      href={`/s/${s.slug}`}
      className="group block h-full rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-semibold text-white transition group-hover:text-white">{s.name}</div>
        <div className="flex items-center gap-2">
          {highlightedBadge ? (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/20 to-cyan-400/20 px-2.5 py-1 text-xs text-white/70">
              Highlighted
            </span>
          ) : null}
          {sourceLabel ? (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55 transition group-hover:border-white/20 group-hover:bg-white/10">
              {sourceIcon}
              <span>{sourceLabel}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 line-clamp-2 text-base leading-relaxed text-white/60">{s.description || ""}</div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/45">
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 transition group-hover:border-white/15 group-hover:bg-white/10">/{s.slug}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 transition group-hover:border-white/15 group-hover:bg-white/10">⭐ {s.stars ?? 0}</span>
      </div>
    </Link>
  );
}
