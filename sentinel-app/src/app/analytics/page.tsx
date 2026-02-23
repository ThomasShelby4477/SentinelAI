"use client";

export default function AnalyticsPage() {
    const violators = [
        { email: "dev.ops@corp.com", count: 34 },
        { email: "raj.patel@corp.com", count: 28 },
        { email: "priya.sharma@corp.com", count: 22 },
        { email: "alex.kumar@corp.com", count: 18 },
        { email: "emily.chen@corp.com", count: 14 },
    ];

    const sources = [
        { name: "Browser Extension", count: 8420, pct: 34, color: "bg-indigo-500" },
        { name: "Reverse Proxy", count: 7230, pct: 29, color: "bg-amber-500" },
        { name: "API Gateway", count: 6102, pct: 25, color: "bg-green-500" },
        { name: "Endpoint Agent", count: 3095, pct: 12, color: "bg-purple-500" },
    ];

    // Generate sparkline-like data for the timeline
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return { date: d.toLocaleDateString("en", { month: "short", day: "numeric" }), scans: Math.floor(Math.random() * 400 + 600), blocked: Math.floor(Math.random() * 60 + 20) };
    });

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                <div className="flex items-center gap-2 bg-green-500/10 px-3.5 py-1.5 rounded-full text-sm font-medium text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Pipeline Active
                </div>
            </div>

            {/* Scan Timeline */}
            <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl mb-6">
                <div className="px-6 py-4 border-b border-[#2a3151]">
                    <h3 className="font-semibold">Scans Over Time (30 days)</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-end gap-[3px] h-40">
                        {days.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                <div className="w-full bg-indigo-500/30 rounded-t relative" style={{ height: `${(d.scans / 1000) * 100}%` }}>
                                    <div className="absolute bottom-0 w-full bg-red-500/50 rounded-t" style={{ height: `${(d.blocked / d.scans) * 100}%` }} />
                                </div>
                                <div className="absolute bottom-[-24px] hidden group-hover:block text-[0.6rem] text-gray-400 whitespace-nowrap">{d.date}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-6 mt-8 text-xs text-gray-500">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-500/30" /> Total Scans</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500/50" /> Blocked</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Top Violators */}
                <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl">
                    <div className="px-6 py-4 border-b border-[#2a3151]">
                        <h3 className="font-semibold">Top Violating Users</h3>
                    </div>
                    <div className="p-4">
                        {violators.map((v, i) => (
                            <div key={v.email} className="flex items-center justify-between py-3 border-b border-[#2a3151] last:border-b-0">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-[0.65rem] font-bold text-indigo-400">{i + 1}</span>
                                    <span className="text-sm">{v.email}</span>
                                </div>
                                <span className="text-sm font-bold text-red-400">{v.count} violations</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Source Distribution */}
                <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl">
                    <div className="px-6 py-4 border-b border-[#2a3151]">
                        <h3 className="font-semibold">Source Distribution</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {sources.map((s) => (
                            <div key={s.name}>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-gray-400">{s.name}</span>
                                    <span className="font-semibold">{s.count.toLocaleString()}</span>
                                </div>
                                <div className="h-2.5 bg-[#0a0e1a] rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
