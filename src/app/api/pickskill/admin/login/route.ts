import { NextResponse } from "next/server";
import { assertAdminEnv, makeAdminCookieValue, pickskillAdminCookieOptions } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  assertAdminEnv();

  const body = (await req.json().catch(() => null)) as null | { username?: string; password?: string };
  const username = (body?.username ?? "").trim();
  const password = body?.password ?? "";

  const ok =
    username.length > 0 &&
    password.length > 0 &&
    username === process.env.PICKSKILL_ADMIN_USER &&
    password === process.env.PICKSKILL_ADMIN_PASS;

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    ...pickskillAdminCookieOptions,
    value: makeAdminCookieValue(),
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
