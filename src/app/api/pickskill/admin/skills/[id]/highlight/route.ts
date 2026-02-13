import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isPickskillAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isPickskillAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as null | { highlighted?: boolean };
  const highlighted = Boolean(body?.highlighted);

  const db = getDb();

  const updated = await db
    .update(skills)
    .set({
      highlighted,
      highlightedAt: highlighted ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, id))
    .returning({
      id: skills.id,
      highlighted: skills.highlighted,
      highlightedAt: skills.highlightedAt,
    });

  const row = updated[0];
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, skill: row });
}
