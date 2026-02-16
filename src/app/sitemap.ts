import type { MetadataRoute } from "next";

import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL || "https://pickskill.ai";

  // Static routes
  const urls: MetadataRoute.Sitemap = [
    {
      url: `${site}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site}/recommended`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Dynamic skill pages
  try {
    const db = getDb();
    const rows = await db
      .select({ slug: skills.slug, updatedAt: skills.updatedAt })
      .from(skills)
      .orderBy(desc(skills.updatedAt))
      .limit(50000);

    for (const r of rows) {
      urls.push({
        url: `${site}/s/${r.slug}`,
        lastModified: r.updatedAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // If DB is unavailable (e.g. during certain build/deploy steps), still emit a valid sitemap.
  }

  return urls;
}
