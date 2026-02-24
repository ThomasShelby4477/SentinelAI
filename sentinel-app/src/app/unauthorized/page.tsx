"use client";

import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-4">
            <div className="bg-[#151b30] border border-[#2a3151] rounded-2xl p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Extension Connected</h1>
                <p className="text-gray-400 mb-6">
                    You have successfully authenticated with SentinelAI. Your browser extension is now active and protecting your data!
                </p>
                <div className="bg-[#1a1f35] border border-[#2a3151] text-sm text-gray-300 rounded-lg p-4 mb-8 text-left">
                    <strong>Note:</strong> You do not have Network Admin privileges to view the central dashboard.
                    However, your background extension is fully operational.
                </div>
                <div className="flex gap-4 w-full">
                    <button
                        onClick={() => {
                            if (window.opener || window.history.length === 1) {
                                window.close();
                            } else {
                                alert("Your browser prevents scripts from closing this tab. Please close it manually by clicking the 'X' on the tab at the top of your screen.");
                            }
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                    >
                        Close Tab
                    </button>
                </div>
            </div>
        </div>
    );
}
