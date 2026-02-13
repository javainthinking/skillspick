import { NextResponse } from "next/server";
import { pickskillAdminCookieOptions } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    ...pickskillAdminCookieOptions,
    value: "",
    maxAge: 0,
  });
  return res;
}
