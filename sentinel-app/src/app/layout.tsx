import "@/app/globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "SentinelAI — AI Data Loss Prevention",
  description: "Enterprise AI-DLP gateway dashboard for monitoring and preventing sensitive data exfiltration to LLMs.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const currentPath = headersList.get("x-pathname") || "";

  // A simple hack to hide sidebar on auth pages in server components 
  // without needing a complex route group restructuring
  const isAuthPage = currentPath.includes("/login") || currentPath.includes("/unauthorized");

  // Global RBAC Check for all dashboard pages
  if (!isAuthPage && !currentPath.startsWith("/api")) {
    const session = await auth.api.getSession({ headers: headersList });
    if (!session || session.user.role !== "admin") {
      redirect("/unauthorized");
    }
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-['Inter'] bg-[#0a0e1a] text-gray-100 antialiased flex min-h-screen">
        {!isAuthPage && <Sidebar />}
        <main className={`flex-1 ${!isAuthPage ? 'ml-[260px]' : ''}`}>
          {children}
        </main>
      </body>
    </html>
  );
}
