import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { revalidatePath } from "next/cache";

export default async function ExemptionsPage() {
    const exemptions = await prisma.exemption.findMany({
        orderBy: { createdAt: 'desc' }
    });

    async function revokeAction(formData: FormData) {
        "use server";
        const id = formData.get("id") as string;
        if (!id) return;
        
        await prisma.exemption.delete({
            where: { id }
        });
        revalidatePath("/exemptions");
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Active Exemptions</h1>
                    <p className="text-gray-400 mt-1 text-sm">Patterns and exact text matches that bypass block policies.</p>
                </div>
            </div>

            <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr>
                            {["Granted", "Allowed Text", "Action"].map((h) => (
                                <th key={h} className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {exemptions.map((ex) => (
                            <tr key={ex.id} className="hover:bg-indigo-500/[0.03] transition-colors border-b border-[#2a3151] last:border-b-0">
                                <td className="px-6 py-4 text-sm text-gray-400">{formatDistanceToNow(new Date(ex.createdAt), { addSuffix: true })}</td>
                                <td className="px-6 py-4 text-sm font-mono text-emerald-400 break-all">{ex.allowedText}</td>
                                <td className="px-6 py-4 text-sm w-32">
                                    <form action={revokeAction}>
                                        <input type="hidden" name="id" value={ex.id} />
                                        <button type="submit" className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md font-medium transition-colors border border-red-500/20">
                                            Revoke
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                        {exemptions.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-gray-500 text-sm">
                                    No active exemptions. Blocked requests will appear normally.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
