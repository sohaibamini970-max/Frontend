// app/layout.tsx
import "./globals.css";
import LayoutWrapper from "./Components/LayoutWrapper";
import { ChatbotButton } from "./Components";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <LayoutWrapper>
          {children}
          {/* Chatbot Button - Always visible */}
          <ChatbotButton />
        </LayoutWrapper>
      </body>
    </html>
  );
}
