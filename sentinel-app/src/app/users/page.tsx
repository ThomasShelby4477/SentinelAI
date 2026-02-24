import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function toggleRole(userId: string, currentRole: string) {
    "use server";
    const newRole = currentRole === "admin" ? "user" : "admin";
    await prisma.user.update({
        where: { id: userId },
        data: { role: newRole }
    });
    revalidatePath("/users");
}

export default async function UsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" }
    });

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            </div>

            <div className="bg-[#1a1f35] border border-[#2a3151] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2a3151]">
                    <h3 className="font-semibold text-gray-200">Organization Members</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage who has access to the SentinelAI admin dashboard.</p>
                </div>

                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 text-left text-[0.65rem] uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">User</th>
                            <th className="px-5 py-3 text-left text-[0.65rem] uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">Role</th>
                            <th className="px-5 py-3 text-left text-[0.65rem] uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">Joined</th>
                            <th className="px-5 py-3 text-right text-[0.65rem] uppercase tracking-wider text-gray-500 bg-black/20 font-semibold border-b border-[#2a3151]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-indigo-500/[0.03] transition-colors border-b border-[#2a3151] last:border-b-0">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.image ? (
                                            <img src={user.image} alt={user.name} className="w-8 h-8 rounded-lg" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                {user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm font-semibold text-gray-200">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[0.6rem] font-semibold uppercase ${user.role === 'admin'
                                            ? 'bg-purple-500/10 text-purple-400'
                                            : 'bg-gray-500/10 text-gray-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-sm text-gray-400">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <form action={toggleRole.bind(null, user.id, user.role)}>
                                        <button
                                            type="submit"
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${user.role === 'admin'
                                                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                    : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                                }`}
                                        >
                                            {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-gray-500 text-sm">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
