import crypto from "crypto";
import { cookies } from "next/headers";

export const PICKSKILL_ADMIN_COOKIE = "pickskill_admin";

function mustSecret() {
  const secret = process.env.PICKSKILL_SESSION_SECRET;
  if (!secret) throw new Error("Missing env PICKSKILL_SESSION_SECRET");
  return secret;
}

function sign(ts: string) {
  const secret = mustSecret();
  return crypto.createHmac("sha256", secret).update(ts).digest("hex");
}

export function makeAdminCookieValue(now = Date.now()) {
  const ts = String(now);
  const sig = sign(ts);
  return `${ts}.${sig}`;
}

export function verifyAdminCookieValue(value: string | undefined | null, maxAgeMs = 1000 * 60 * 60 * 24 * 30) {
  if (!value) return false;
  const [ts, sig] = value.split(".");
  if (!ts || !sig) return false;
  const expected = sign(ts);
  // Timing-safe compare (must be same length)
  if (sig.length !== expected.length) return false;
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return false;

  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0) return false;
  if (age > maxAgeMs) return false;
  return true;
}

export async function isPickskillAdmin() {
  const jar = await cookies();
  const v = jar.get(PICKSKILL_ADMIN_COOKIE)?.value;
  return verifyAdminCookieValue(v);
}

export const pickskillAdminCookieOptions = {
  name: PICKSKILL_ADMIN_COOKIE,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: true,
  path: "/",
} as const;

export function assertAdminEnv() {
  if (!process.env.PICKSKILL_ADMIN_USER) throw new Error("Missing env PICKSKILL_ADMIN_USER");
  if (!process.env.PICKSKILL_ADMIN_PASS) throw new Error("Missing env PICKSKILL_ADMIN_PASS");
  mustSecret();
}
