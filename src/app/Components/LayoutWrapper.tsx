"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Login page should have NO Header
  const isLoginPage = pathname === "/login";

  return (
    <>
      {!isLoginPage && <Header />}

      <main>{children}</main>
    </>
  );
}