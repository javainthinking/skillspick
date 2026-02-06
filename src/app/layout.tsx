import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
