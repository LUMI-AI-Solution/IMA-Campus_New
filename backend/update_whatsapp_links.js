/**
 * Quick Helper Script to Update WhatsApp Community Invite Links
 * 
 * Usage:
 *   1. Replace the URLs in the array below with your actual WhatsApp community invite links.
 *   2. Run: node update_whatsapp_links.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 👉 මෙතනට ඔයාගේ ඇත්තම WhatsApp Community Links 6 දාන්න:
const MY_COMMUNITIES = [
    { name: "Community 01", inviteUrl: "https://chat.whatsapp.com/DA6F7HREzc98FscGEtpnfh", maxLimit: 1020, isActive: true },
    { name: "Community 02", inviteUrl: "https://chat.whatsapp.com/JpQf9iK6P8c5mHfuqGKtMq", maxLimit: 1020, isActive: true },
    { name: "Community 03", inviteUrl: "https://chat.whatsapp.com/H4juZ3TMh1A9ZxV1YfF5E5", maxLimit: 1020, isActive: true },
    { name: "Community 04", inviteUrl: "https://chat.whatsapp.com/EyUaBUqep7I9BjvzWRe7Gc", maxLimit: 1020, isActive: true },
    { name: "Community 05", inviteUrl: "https://chat.whatsapp.com/KrKpxQfxblXGmacMtIfMuU", maxLimit: 1020, isActive: true },
    { name: "Community 06", inviteUrl: "https://chat.whatsapp.com/CrEoARiZsIR5QJgcw5PBWs", maxLimit: 1020, isActive: true },
    { name: "Community 07", inviteUrl: "https://chat.whatsapp.com/EaPaBwOE7ZECMUQXIfePnJ", maxLimit: 1020, isActive: true },
    { name: "Community 08", inviteUrl: "https://chat.whatsapp.com/LXiWnOdckAMJsDDWPfpvVL", maxLimit: 1020, isActive: true },
];

async function updateLinks() {
    console.log("🔄 Updating WhatsApp Community links for campaign 'default'...");

    for (let i = 0; i < MY_COMMUNITIES.length; i++) {
        const item = MY_COMMUNITIES[i];
        const order = i + 1;

        // Upsert by campaign and orderIndex
        const existing = await prisma.whatsappRotator.findFirst({
            where: {
                campaign: 'default',
                orderIndex: order
            }
        });

        if (existing) {
            await prisma.whatsappRotator.update({
                where: { id: existing.id },
                data: {
                    name: item.name,
                    inviteUrl: item.inviteUrl,
                    maxLimit: item.maxLimit || 1020,
                    isActive: item.isActive !== undefined ? item.isActive : true
                }
            });
            console.log(`✅ Updated: [${existing.id}] ${item.name} -> ${item.inviteUrl}`);
        } else {
            const created = await prisma.whatsappRotator.create({
                data: {
                    campaign: 'default',
                    name: item.name,
                    inviteUrl: item.inviteUrl,
                    maxLimit: item.maxLimit || 1020,
                    isActive: item.isActive !== undefined ? item.isActive : true,
                    orderIndex: order
                }
            });
            console.log(`✨ Created: [${created.id}] ${item.name} -> ${item.inviteUrl}`);
        }
    }

    console.log("\n🎉 All 6 WhatsApp Community links updated successfully!");
    const all = await prisma.whatsappRotator.findMany({
        where: { campaign: 'default' },
        orderBy: { orderIndex: 'asc' }
    });
    console.table(all.map(l => ({
        Order: l.orderIndex,
        Name: l.name,
        Active: l.isActive,
        Clicks: l.clickCount,
        MaxLimit: l.maxLimit,
        URL: l.inviteUrl
    })));

    await prisma.$disconnect();
}

updateLinks().catch(err => {
    console.error("❌ Update failed:", err);
    process.exit(1);
});
