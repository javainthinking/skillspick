import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PickSkill",
  description: "A minimal search engine for AI agent skills.",
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
