import "@/app/globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "SentinelAI — AI Data Loss Prevention",
  description: "Enterprise AI-DLP gateway dashboard for monitoring and preventing sensitive data exfiltration to LLMs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-['Inter'] bg-[#0a0e1a] text-gray-100 antialiased flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[260px]">
          {children}
        </main>
      </body>
    </html>
  );
}
