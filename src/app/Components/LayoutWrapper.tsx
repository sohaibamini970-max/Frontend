// app/Components/LayoutWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import ChatbotButton from "./ChatbotButton";

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

      {/* Show chatbot on all pages EXCEPT login */}
      {!isLoginPage && <ChatbotButton />}
    </>
  );
}
