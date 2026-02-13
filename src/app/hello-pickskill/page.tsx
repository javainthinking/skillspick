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
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex justify-center">
          <AdminLoginBox isAdmin={isAdmin} />
        </div>
      </div>
    </main>
  );
}
