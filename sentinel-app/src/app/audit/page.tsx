"use client";

const DEMO_AUDIT = [
    { time: "2 min ago", user: "priya.sharma@corp.com", source: "browser_extension", dest: "chatgpt.com", action: "BLOCK", score: 0.95, detection: "Aadhaar Number", latency: "7ms" },
    { time: "8 min ago", user: "raj.patel@corp.com", source: "api_gateway", dest: "api.openai.com", action: "BLOCK", score: 0.98, detection: "OpenAI API Key", latency: "5ms" },
    { time: "15 min ago", user: "emily.chen@corp.com", source: "proxy", dest: "claude.ai", action: "BLOCK", score: 0.92, detection: "PostgreSQL Connection", latency: "12ms" },
    { time: "23 min ago", user: "alex.kumar@corp.com", source: "browser_extension", dest: "chatgpt.com", action: "WARN", score: 0.62, detection: "Source Code (Python)", latency: "8ms" },
    { time: "31 min ago", user: "sarah.jones@corp.com", source: "endpoint_agent", dest: "gemini.google.com", action: "BLOCK", score: 0.88, detection: "JWT Token", latency: "6ms" },
    { time: "45 min ago", user: "dev.ops@corp.com", source: "api_gateway", dest: "api.anthropic.com", action: "BLOCK", score: 0.97, detection: "AWS Access Key", latency: "4ms" },
    { time: "1 hr ago", user: "neha.gupta@corp.com", source: "browser_extension", dest: "chatgpt.com", action: "WARN", score: 0.45, detection: "Email + Phone PII", latency: "9ms" },
    { time: "1.5 hr ago", user: "mike.wilson@corp.com", source: "proxy", dest: "copilot.microsoft.com", action: "WARN", score: 0.52, detection: "Internal URL", latency: "11ms" },
    { time: "2 hr ago", user: "alice.brown@corp.com", source: "api_gateway", dest: "api.openai.com", action: "BLOCK", score: 0.91, detection: "Private Key", latency: "3ms" },
    { time: "2.5 hr ago", user: "bob.smith@corp.com", source: "browser_extension", dest: "claude.ai", action: "WARN", score: 0.55, detection: "Credit Card", latency: "7ms" },
];

const badge: Record<string, string> = {
    BLOCK: "bg-red-500/10 text-red-400",
    WARN: "bg-amber-500/10 text-amber-400",
};

export default function AuditPage() {
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
                <div className="flex gap-2">
                    <select className="bg-[#151b30] border border-[#2a3151] rounded-lg px-3 py-1.5 text-xs text-gray-400 outline-none">
                        <option value="">All Actions</option>
                        <option>BLOCK</option>
                        <option>WARN</option>
                    </select>
                    <select className="bg-[#151b30] border border-[#2a3151] rounded-lg px-3 py-1.5 text-xs text-gray-400 outline-none">
                        <option value="">All Sources</option>
                        <option>browser_extension</option>
                        <option>api_gateway</option>
                        <option>proxy</option>
                        <option>endpoint_agent</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr>
                            {["Time", "User", "Source", "Destination", "Action", "Score", "Detection", "Latency"].map((h) => (
                                <th key={h} className="px-5 py-3 text-left text-[0.65rem] uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DEMO_AUDIT.map((e, i) => (
                            <tr key={i} className="hover:bg-indigo-500/[0.03] transition-colors border-b border-[#2a3151] last:border-b-0">
                                <td className="px-5 py-3 text-sm text-gray-400">{e.time}</td>
                                <td className="px-5 py-3 text-sm text-gray-300">{e.user}</td>
                                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase bg-blue-500/10 text-blue-400">{e.source.replace(/_/g, " ")}</span></td>
                                <td className="px-5 py-3 text-sm text-gray-400">{e.dest}</td>
                                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase ${badge[e.action]}`}>{e.action}</span></td>
                                <td className="px-5 py-3 text-sm font-bold">{e.score.toFixed(3)}</td>
                                <td className="px-5 py-3 text-sm">{e.detection}</td>
                                <td className="px-5 py-3 text-sm text-gray-500">{e.latency}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
