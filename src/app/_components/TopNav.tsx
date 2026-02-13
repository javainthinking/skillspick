import Link from "next/link";

export default function TopNav({ active }: { active?: "home" | "recommended" }) {
  const item = (href: string, label: string, key: "home" | "recommended") => (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active === key
          ? "border-white/25 bg-white/10 text-white"
          : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.06] hover:text-white/85"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/" className="text-sm font-semibold text-white/80 hover:text-white">PickSkill</Link>
      <nav className="flex items-center gap-2">
        {item("/", "All", "home")}
        {item("/recommended", "Recommended", "recommended")}
      </nav>
    </header>
  );
}
