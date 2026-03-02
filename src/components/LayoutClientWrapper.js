"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function LayoutClientWrapper({ children }) {
  const pathname = usePathname();

  // Define which paths should NOT show the header
  const noHeaderPaths = ["/"];
  const showHeader = !noHeaderPaths.includes(pathname);

  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}
