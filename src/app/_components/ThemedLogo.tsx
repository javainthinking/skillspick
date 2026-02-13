"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemedLogo({ size = 28 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch / flashes: render nothing until mounted.
  if (!mounted) return <div style={{ width: size, height: size }} />;

  const src = resolvedTheme === "dark" ? "/white-pickskill.svg" : "/black-pickskill.svg";
  return (
    <Image
      src={src}
      alt="PickSkill"
      width={size}
      height={size}
      priority
      className="opacity-90 transition group-hover:opacity-100"
    />
  );
}
