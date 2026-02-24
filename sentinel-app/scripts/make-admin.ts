import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error("❌ Error: Please provide an email address.");
        console.error("Usage: npx tsx scripts/make-admin.ts <your-email@google.com>");
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: "admin" },
        });
        console.log(`✅ Success! Successfully promoted ${user.name} (${user.email}) to Administrator.`);
    } catch (error) {
        console.error(`❌ Failed to promote user. Are you sure ${email} has logged in at least once?`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
