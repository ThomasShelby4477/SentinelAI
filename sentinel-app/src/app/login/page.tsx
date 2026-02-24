"use client";

import { signIn } from "@/lib/auth-client";
import { useState } from "react";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    return (
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
            <div className="bg-[#151b30] border border-[#2a3151] rounded-2xl p-8 w-full max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-indigo-400">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome to SentinelAI</h1>
                <p className="text-sm text-slate-400 mb-8">Sign in to manage policies and view audit logs.</p>

                <button
                    onClick={async () => {
                        setLoading(true);
                        await signIn.social({ provider: "google", callbackURL: "/" });
                    }}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
                >
                    {loading ? "Signing in..." : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
