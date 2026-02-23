"use client";

import { useState } from "react";

interface Detection {
    type: string;
    category: string;
    severity: string;
    detector: string;
    span: string;
    confidence: number;
}

interface ScanResult {
    request_id: string;
    action: string;
    risk_score: number;
    detections: Detection[];
    latency_ms: number;
    message: string;
}

const badgeColor: Record<string, string> = {
    BLOCK: "bg-red-500/10 text-red-400 border-red-500/20",
    WARN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ALLOW: "bg-green-500/10 text-green-400 border-green-500/20",
    critical: "bg-red-500/10 text-red-400",
    high: "bg-orange-500/10 text-orange-400",
    medium: "bg-amber-500/10 text-amber-400",
    low: "bg-blue-500/10 text-blue-400",
};

export default function ScannerPage() {
    const [prompt, setPrompt] = useState("");
    const [source, setSource] = useState("browser_extension");
    const [destination, setDestination] = useState("api.openai.com");
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);

    const runScan = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source, destination, prompt, metadata: { app: "dashboard" } }),
            });
            const data = await res.json();
            setResult(data);
        } catch {
            setResult(null);
        }
        setLoading(false);
    };

    const scoreColor = result
        ? result.risk_score >= 0.7 ? "text-red-400" : result.risk_score >= 0.3 ? "text-amber-400" : "text-green-400"
        : "";

    const barColor = result
        ? result.risk_score >= 0.7 ? "bg-red-500" : result.risk_score >= 0.3 ? "bg-amber-500" : "bg-green-500"
        : "";

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Live Scanner</h1>
                <div className="flex items-center gap-2 bg-green-500/10 px-3.5 py-1.5 rounded-full text-sm font-medium text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Pipeline Active
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Input */}
                <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl">
                    <div className="px-6 py-4 border-b border-[#2a3151] flex items-center justify-between">
                        <h3 className="font-semibold">Real-Time Prompt Scanner</h3>
                        <span className="px-2.5 py-1 rounded text-[0.65rem] font-semibold uppercase bg-blue-500/10 text-blue-400">Test Mode</span>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Source</label>
                            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-[#151b30] border border-[#2a3151] rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none">
                                <option value="browser_extension">Browser Extension</option>
                                <option value="api_gateway">API Gateway</option>
                                <option value="proxy">Reverse Proxy</option>
                                <option value="endpoint_agent">Endpoint Agent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Destination</label>
                            <input value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full bg-[#151b30] border border-[#2a3151] rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Prompt to Scan</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Paste a prompt to test for sensitive data..."
                                className="w-full bg-[#151b30] border border-[#2a3151] rounded-lg px-3 py-2.5 text-sm font-mono min-h-[150px] resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>
                        <button
                            onClick={runScan}
                            disabled={loading || !prompt.trim()}
                            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-400 hover:to-purple-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            )}
                            {loading ? "Scanning..." : "Scan Prompt"}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className={`bg-[#1a1f35] border border-[#2a3151] rounded-xl ${!result ? "flex items-center justify-center" : ""}`}>
                    {!result ? (
                        <div className="text-center text-gray-500 p-12">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-4 opacity-30"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            <p className="text-sm">Enter a prompt and click Scan to see results</p>
                        </div>
                    ) : (
                        <>
                            <div className="px-6 py-4 border-b border-[#2a3151] flex items-center justify-between">
                                <h3 className="font-semibold">Scan Results</h3>
                                <span className={`px-2.5 py-1 rounded text-[0.65rem] font-semibold uppercase border ${badgeColor[result.action]}`}>{result.action}</span>
                            </div>
                            <div className="p-6">
                                <div className="flex gap-6 mb-4">
                                    {[
                                        { label: "Risk Score", value: result.risk_score.toFixed(4), className: scoreColor },
                                        { label: "Detections", value: result.detections.length },
                                        { label: "Latency", value: `${result.latency_ms}ms` },
                                        { label: "Action", value: result.action },
                                    ].map((m) => (
                                        <div key={m.label} className="flex flex-col">
                                            <span className="text-[0.6rem] text-gray-500 uppercase tracking-wider">{m.label}</span>
                                            <span className={`text-lg font-bold ${m.className || ""}`}>{m.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-1.5 bg-[#0a0e1a] rounded-full overflow-hidden mb-4">
                                    <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${result.risk_score * 100}%` }} />
                                </div>

                                {result.message && <p className={`text-sm font-semibold ${scoreColor} mb-5`}>{result.message}</p>}

                                {result.detections.length === 0 ? (
                                    <p className="text-green-400 text-center py-8">✅ No sensitive data detected. Prompt is clean.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {result.detections.map((d, i) => (
                                            <div key={i} className={`p-3.5 bg-black/20 rounded-lg border-l-[3px] ${d.severity === "critical" ? "border-red-500" : d.severity === "high" ? "border-orange-500" : "border-amber-500"}`}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="font-bold text-sm">{d.type}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase ${badgeColor[d.severity]}`}>{d.severity}</span>
                                                    <span className="text-gray-500 text-xs">{d.detector}</span>
                                                </div>
                                                <code className="text-xs text-amber-400 break-all">{d.span}</code>
                                                <div className="text-gray-500 text-xs mt-1">
                                                    Confidence: {(d.confidence * 100).toFixed(1)}% · Category: {d.category}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
