import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-[var(--font-display)] text-sm font-semibold tracking-tight text-white/90 hover:text-white">
          PickSkill
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/import"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            Import
          </Link>
        </nav>
      </div>
    </header>
  );
}
