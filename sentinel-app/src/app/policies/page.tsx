"use client";

import { useState } from "react";

const DEMO_POLICIES = [
    { id: "1", name: "PII Protection", desc: "Blocks Aadhaar, PAN, SSN, email, and phone numbers from being sent to any LLM endpoint.", action: "BLOCK", active: true, detectors: ["aadhaar", "pan", "ssn", "email", "phone"], priority: 10 },
    { id: "2", name: "API Key & Secret Guard", desc: "Prevents API keys, tokens, and credentials from leaking to external AI services.", action: "BLOCK", active: true, detectors: ["openai_key", "aws_key", "github_token", "jwt", "private_key"], priority: 5 },
    { id: "3", name: "Database Connection Strings", desc: "Blocks PostgreSQL, MySQL, MongoDB, and Redis connection strings.", action: "BLOCK", active: true, detectors: ["postgres_conn", "mysql_conn", "mongodb_conn", "redis_conn"], priority: 15 },
    { id: "4", name: "Source Code Leakage", desc: "Warns when source code snippets in Python, JS, Java, or SQL are detected in prompts.", action: "WARN", active: true, detectors: ["code_python", "code_javascript", "code_java", "code_sql"], priority: 50 },
    { id: "5", name: "Internal Infrastructure", desc: "Blocks internal/corporate URLs and private IP addresses from being shared.", action: "BLOCK", active: true, detectors: ["internal_url", "private_ip"], priority: 20 },
    { id: "6", name: "Financial Data", desc: "Warns on credit card numbers, IBAN, and financial figures detected in prompts.", action: "WARN", active: false, detectors: ["credit_card", "iban", "financial"], priority: 60 },
];

export default function PoliciesPage() {
    const [policies, setPolicies] = useState(DEMO_POLICIES);

    const toggle = (id: string) => {
        setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
                <button className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
                    + New Policy
                </button>
            </div>

            <h2 className="text-lg font-bold mb-5">Detection Policies</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {policies.map((p) => (
                    <div key={p.id} className="bg-[#1a1f35] border border-[#2a3151] rounded-xl p-6 hover:border-indigo-500/50 hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold">{p.name}</span>
                            <span className={`px-2.5 py-1 rounded text-[0.65rem] font-semibold uppercase ${p.action === "BLOCK" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                                {p.action}
                            </span>
                        </div>

                        <p className="text-gray-500 text-xs leading-relaxed mb-4">{p.desc}</p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {p.detectors.map((d) => (
                                <span key={d} className="px-2 py-0.5 bg-indigo-500/10 rounded text-[0.65rem] font-medium text-indigo-400">{d}</span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[#2a3151]">
                            <span className="text-[0.7rem] text-gray-500">Priority: {p.priority}</span>
                            <button
                                onClick={() => toggle(p.id)}
                                className={`w-11 h-6 rounded-full relative transition-colors ${p.active ? "bg-indigo-500" : "bg-[#2a3151]"}`}
                            >
                                <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform ${p.active ? "translate-x-5" : ""}`} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
