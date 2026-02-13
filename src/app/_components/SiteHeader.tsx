import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import ThemeToggle from "@/app/_components/ThemeToggle";

const brandFont = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

function ImportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v10" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[color:var(--ui-border)] bg-[color:var(--ui-bg)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className={`group flex items-center gap-2.5 ${brandFont.className}`}>
          <Image
            src="/white-pickskill.svg"
            alt="PickSkill"
            width={28}
            height={28}
            priority
            className="opacity-90 transition group-hover:opacity-100"
          />
          <span className="text-[17px] font-semibold tracking-tight text-[color:var(--ui-fg)] transition group-hover:text-[color:var(--foreground)]">
            PickSkill
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          <Link
            href="/recommended"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-white/80 shadow-sm transition hover:border-white/25 hover:bg-white/[0.06]"
          >
            <StarIcon className="h-4 w-4 text-fuchsia-200/90" />
            <span>Recommended</span>
          </Link>

          <Link
            href="/import"
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-black shadow-sm ring-1 ring-white/20 transition hover:-translate-y-[1px] hover:bg-white/95 active:translate-y-0"
          >
            <ImportIcon className="h-4 w-4" />
            <span>Import</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
