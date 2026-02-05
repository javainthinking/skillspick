import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillsPick",
  description: "A fast search engine for AI agent skills.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
