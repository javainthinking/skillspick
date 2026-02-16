import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL || "https://pickskill.ai";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Not a real content page; avoid indexing.
        disallow: ["/hello-pickskill"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
