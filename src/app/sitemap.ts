import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.SITE_URL || "https://pickskill.ai";
  const db = getDb();
  const rows = await db.select({ slug: skills.slug, updatedAt: skills.updatedAt }).from(skills).orderBy(desc(skills.updatedAt)).limit(50000);

  return [
    { url: `${siteUrl}/`, lastModified: new Date() },
    ...rows.map((r) => ({ url: `${siteUrl}/s/${r.slug}`, lastModified: r.updatedAt ?? new Date() })),
  ];
}
