import { NextResponse } from "next/server";
import { exec as childExec } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(childExec);

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  const got = req.headers.get("x-ingest-secret");

  if (!secret || !got || got !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Run ingest script inside the deployment.
  // NOTE: on Vercel, long ingests should move to GitHub Actions; keep this light.
  try {
    const { stdout, stderr } = await pexec("npm run ingest:awesome", { timeout: 60_000 });
    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ingest failed";
    const anyE = e as { stdout?: string; stderr?: string };
    return NextResponse.json({ ok: false, error: msg, stdout: anyE?.stdout, stderr: anyE?.stderr }, { status: 500 });
  }
}
