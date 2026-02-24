import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

const badge: Record<string, string> = {
    BLOCK: "bg-red-500/10 text-red-400",
    WARN: "bg-amber-500/10 text-amber-400",
    ALLOW: "bg-green-500/10 text-green-400",
};

export default async function AuditPage() {
    const auditLogs = await prisma.auditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    });

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
                        {auditLogs.map((e) => {
                            let parsedDetections = [];
                            try { parsedDetections = typeof e.detections === 'string' ? JSON.parse(e.detections as string) : e.detections; } catch (err) { }
                            const detectionStr = Array.isArray(parsedDetections) ? parsedDetections.map((d: any) => d.type).join(', ') : 'Unknown';

                            return (
                                <tr key={e.id} className="hover:bg-indigo-500/[0.03] transition-colors border-b border-[#2a3151] last:border-b-0">
                                    <td className="px-5 py-3 text-sm text-gray-400">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</td>
                                    <td className="px-5 py-3 text-sm text-gray-300">{e.userEmail || "Anonymous"}</td>
                                    <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase bg-blue-500/10 text-blue-400">{e.source.replace(/_/g, " ")}</span></td>
                                    <td className="px-5 py-3 text-sm text-gray-400" title={e.destination || ""}>{e.destination || "N/A"}</td>
                                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase ${badge[e.action]}`}>{e.action}</span></td>
                                    <td className="px-5 py-3 text-sm font-bold">{e.riskScore.toFixed(3)}</td>
                                    <td className="px-5 py-3 text-sm truncate max-w-[200px]" title={detectionStr}>{detectionStr}</td>
                                    <td className="px-5 py-3 text-sm text-gray-500">{e.latencyMs ? `${e.latencyMs}ms` : "-"}</td>
                                </tr>
                            )
                        })}
                        {auditLogs.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-8 text-center text-gray-500 text-sm">
                                    No audit logs recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
