import { cookies } from "next/headers";
import type { Metadata } from "next";

import AdminLoginBox from "@/app/_components/AdminLoginBox";
import { verifyAdminCookieValue } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PickSkill Admin Login",
  description: "Admin login for PickSkill.",
  alternates: { canonical: "/hello-pickskill" },
};

export default async function HelloPickskillPage() {
  const jar = await cookies();
  const isAdmin = verifyAdminCookieValue(jar.get("pickskill_admin")?.value);

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_500px_at_10%_20%,rgba(99,102,241,0.16),transparent_55%)]">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex justify-center">
          <AdminLoginBox isAdmin={isAdmin} />
        </div>
      </div>
    </main>
  );
}
