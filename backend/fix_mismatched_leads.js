const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getLast9Digits(str) {
    if (!str) return '';
    const num = str.replace(/[^0-9]/g, '');
    return num.slice(-9);
}

async function main() {
    console.log("Fetching all Enrolled AFTER_SEMINAR leads...");
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', enrollmentStatus: 'ENROLLED' }
    });

    const payments = await prisma.payment.findMany({
        where: { status: { in: [1, 4] } },
        include: { student: true }
    });

    let revertCount = 0;
    for (let l of leads) {
        const leadLast9 = getLast9Digits(l.phone.split('_')[0]);
        const match = payments.find(p => (getLast9Digits(p.student?.phone) === leadLast9 || getLast9Digits(p.student?.whatsapp) === leadLast9));
        
        if (!match) {
            // Revert status to PENDING
            await prisma.lead.update({
                where: { id: l.id },
                data: { enrollmentStatus: 'PENDING' }
            });
            revertCount++;
        }
    }
    console.log(`Reverted ${revertCount} falsely ENROLLED leads back to PENDING.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
