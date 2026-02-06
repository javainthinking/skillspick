import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
});

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
    <html lang="en" className={`${manrope.variable} ${bricolage.variable}`}>
      <head>
        {/* Fallback in case next/font classes fail to hydrate on some deployments */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
