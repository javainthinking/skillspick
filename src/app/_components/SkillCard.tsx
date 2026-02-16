import Link from "next/link";
import GitHubLogo from "@/app/_components/GitHubLogo";

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
      <GitHubLogo className="h-4 w-4 opacity-85" />
    ) : null;

  return (
    <Link
      key={s.id}
      href={`/s/${s.slug}`}
      className="group block h-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-bg-hover)] dark:shadow-[0_18px_70px_rgba(0,0,0,0.18)]"
    >
      <div className="text-lg font-semibold leading-snug text-[color:var(--ui-fg)] transition group-hover:text-[color:var(--foreground)]">{s.name}</div>

      {(highlightedBadge || sourceLabel) ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {highlightedBadge ? (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/20 to-cyan-400/20 px-2.5 py-1 text-xs text-[color:var(--ui-fg)]">
              Highlighted
            </span>
          ) : null}
          {sourceLabel ? (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-2.5 py-1 text-xs text-[color:var(--ui-fg-muted)] transition group-hover:border-[color:var(--ui-border-strong)] group-hover:bg-[color:var(--ui-bg-hover)]">
              {sourceIcon}
              <span>{sourceLabel}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 line-clamp-2 text-base leading-relaxed text-[color:var(--ui-fg-muted)]">{s.description || ""}</div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[color:var(--ui-fg-faint)]">
        <span className="rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-2.5 py-1 transition group-hover:border-[color:var(--ui-border-strong)] group-hover:bg-[color:var(--ui-bg-hover)]">/{s.slug}</span>
        <span className="rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] px-2.5 py-1 transition group-hover:border-[color:var(--ui-border-strong)] group-hover:bg-[color:var(--ui-bg-hover)]">⭐ {s.stars ?? 0}</span>
      </div>
    </Link>
  );
}
