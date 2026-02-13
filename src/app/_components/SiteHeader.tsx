import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google";

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

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className={`group flex items-center gap-2.5 ${brandFont.className}`}>
          <Image
            src="/white-pickskill.svg"
            alt="PickSkill"
            width={28}
            height={28}
            priority
            className="opacity-90 transition group-hover:opacity-100"
          />
          <span className="text-[17px] font-semibold tracking-tight text-white/90 transition group-hover:text-white">
            PickSkill
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/recommended"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-white/80 shadow-sm transition hover:border-white/25 hover:bg-white/[0.06]"
          >
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
