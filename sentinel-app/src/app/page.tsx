import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const badgeColor: Record<string, string> = {
  BLOCK: "bg-red-500/10 text-red-400",
  WARN: "bg-amber-500/10 text-amber-400",
  ALLOW: "bg-green-500/10 text-green-400",
  critical: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-blue-500/10 text-blue-400",
};

function StatCard({ icon, value, label, trend, color }: { icon: string; value: string | number; label: string; trend?: string; color: string }) {
  const colorMap: Record<string, string> = { blue: "bg-blue-500/10 text-blue-400", red: "bg-red-500/10 text-red-400", amber: "bg-amber-500/10 text-amber-400", green: "bg-green-500/10 text-green-400" };
  return (
    <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl p-5 flex items-center gap-4 hover:border-indigo-500/50 hover:-translate-y-0.5 transition-all group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1">
        <span className="block text-[1.7rem] font-extrabold tracking-tight">{value}</span>
        <span className="block text-gray-500 text-xs">{label}</span>
      </div>
      {trend && <span className={`text-xs font-semibold px-2 py-0.5 rounded ${trend.startsWith("+") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{trend}</span>}
    </div>
  );
}

export default async function DashboardPage() {
  const [totalScans, blocked, warned, recentViolations] = await Promise.all([
    prisma.auditEvent.count(),
    prisma.auditEvent.count({ where: { action: "BLOCK" } }),
    prisma.auditEvent.count({ where: { action: "WARN" } }),
    prisma.auditEvent.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
    })
  ]);

  const blockRate = totalScans > 0 ? ((blocked / totalScans) * 100).toFixed(1) + "%" : "0%";

  return (
    <div className="p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2 bg-green-500/10 px-3.5 py-1.5 rounded-full text-sm font-medium text-green-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live Telemetry Active
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard icon="🔍" value={totalScans.toLocaleString()} label="Total Scans" color="blue" />
        <StatCard icon="🛑" value={blocked.toLocaleString()} label="Blocked" color="red" />
        <StatCard icon="⚠️" value={warned.toLocaleString()} label="Warned" color="amber" />
        <StatCard icon="📊" value={blockRate} label="Block Rate" color="green" />
      </div>

      {/* Charts placeholder — static cards */}
      <div className="grid grid-cols-2 gap-5 mb-7">
        <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl">
          <div className="px-6 py-4 border-b border-[#2a3151] flex items-center justify-between">
            <h3 className="font-semibold">Detection Types Distribution</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-3">
            {[
              { name: "PII", count: 342, color: "bg-indigo-500" },
              { name: "API Keys", count: 287, color: "bg-red-500" },
              { name: "Tokens", count: 156, color: "bg-amber-500" },
              { name: "DB Connections", count: 98, color: "bg-cyan-500" },
              { name: "Source Code", count: 203, color: "bg-green-500" },
              { name: "Internal URLs", count: 67, color: "bg-purple-500" },
              { name: "Financial", count: 45, color: "bg-pink-500" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-400 flex-1">{item.name}</span>
                <span className="text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl">
          <div className="px-6 py-4 border-b border-[#2a3151]">
            <h3 className="font-semibold">Threat Severity Breakdown</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { level: "Critical", count: 487, pct: 41, color: "bg-red-500" },
              { level: "High", count: 396, pct: 33, color: "bg-orange-500" },
              { level: "Medium", count: 234, pct: 20, color: "bg-amber-500" },
              { level: "Low", count: 81, pct: 7, color: "bg-blue-500" },
            ].map((item) => (
              <div key={item.level}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{item.level}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl">
        <div className="px-6 py-4 border-b border-[#2a3151] flex items-center justify-between">
          <h3 className="font-semibold">Recent Violations</h3>
          <a href="/audit" className="text-indigo-400 text-sm font-medium hover:text-indigo-300">View All →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["Time", "User", "Source", "Detection", "Severity", "Action", "Score"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[0.7rem] uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentViolations.map((v) => {
                let parsedDetections = [];
                try { parsedDetections = typeof v.detections === 'string' ? JSON.parse(v.detections) : v.detections; } catch (e) { }
                const detectionStr = Array.isArray(parsedDetections) ? parsedDetections.map((d: any) => d.type).join(', ') : 'Unknown';

                return (
                  <tr key={v.id} className="hover:bg-indigo-500/[0.03] transition-colors border-b border-[#2a3151] last:border-b-0">
                    <td className="px-5 py-3.5 text-sm text-gray-400">{formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{v.userEmail || "Anonymous"}</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded text-[0.65rem] font-semibold uppercase bg-blue-500/10 text-blue-400">{v.source.replace("_", " ")}</span></td>
                    <td className="px-5 py-3.5 text-sm truncate max-w-[200px]" title={detectionStr}>{detectionStr}</td>
                    <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded text-[0.65rem] font-semibold uppercase ${badgeColor[v.action === 'BLOCK' ? 'critical' : 'high']}`}>
                      {v.action === 'BLOCK' ? 'critical' : 'high'}
                    </span></td>
                    <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded text-[0.65rem] font-semibold uppercase ${badgeColor[v.action]}`}>{v.action}</span></td>
                    <td className="px-5 py-3.5 text-sm font-bold">{v.riskScore.toFixed(2)}</td>
                  </tr>
                )
              })}
              {recentViolations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500 text-sm">
                    No violations recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
