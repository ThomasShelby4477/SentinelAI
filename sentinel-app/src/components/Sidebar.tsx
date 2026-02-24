"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

const navItems = [
    { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
    { href: "/scanner", label: "Live Scanner", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { href: "/policies", label: "Policies", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { href: "/audit", label: "Audit Log", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { href: "/analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { href: "/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, isPending } = useSession();

    return (
        <aside className="w-[260px] h-screen fixed left-0 top-0 bg-[#111827] border-r border-[#2a3151] flex flex-col z-50">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-[#2a3151]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        SentinelAI
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 flex flex-col gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative
                ${isActive
                                    ? "bg-indigo-500/10 text-indigo-400"
                                    : "text-gray-400 hover:bg-indigo-500/5 hover:text-gray-200"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-indigo-500 rounded-r" />
                            )}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                            </svg>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#2a3151]">
                <div className="flex items-center gap-3 w-full">
                    {isPending ? (
                        <div className="animate-pulse bg-[#2a3151] w-9 h-9 rounded-[10px]" />
                    ) : session?.user?.image ? (
                        <img src={session.user.image} alt="User" className="w-9 h-9 rounded-[10px]" />
                    ) : (
                        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
                            {session?.user?.name?.substring(0, 2).toUpperCase() || "SA"}
                        </div>
                    )}
                    <div className="flex flex-col flex-1 truncate">
                        <span className="text-sm font-semibold truncate">{session?.user?.name || "Security Admin"}</span>
                        <span className="text-xs text-gray-500 truncate">{session?.user?.email || "Administrator"}</span>
                    </div>

                    <button
                        onClick={async () => {
                            await signOut();
                            router.push("/login");
                        }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a3151] rounded-md transition shrink-0"
                        title="Sign Out"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </aside>
    );
}
