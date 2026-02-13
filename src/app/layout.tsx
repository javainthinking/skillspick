import type { Metadata } from "next";
import Script from "next/script";
import { SiteHeader } from "@/app/_components/SiteHeader";
import ThemeProvider from "@/app/_components/ThemeProvider";

import "@fontsource-variable/manrope";
import "@fontsource-variable/bricolage-grotesque";
import "github-markdown-css/github-markdown.css";

import "./globals.css";

const siteUrl = process.env.SITE_URL || "https://pickskill.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PickSkill",
    template: "%s | PickSkill",
  },
  description: "A minimal search engine for AI agent skills.",
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "PickSkill",
    title: "PickSkill",
    description: "A minimal search engine for AI agent skills.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PickSkill",
    description: "A minimal search engine for AI agent skills.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const gaId = process.env.NEXT_PUBLIC_GA4_ID || "G-621YMBCJPG";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) - GA4 */}
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
        <Script
          id="ga4-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);} 
gtag('js', new Date());
gtag('config', '${gaId}');`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <SiteHeader />
          <div className="pt-14">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
