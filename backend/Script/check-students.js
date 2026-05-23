const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMismatch() {
    // 1. ඔක්කොම Paid Students ලා ගන්න
    const paidStudents = await prisma.payment.findMany({
        where: { status: { in: [1, 4] } },
        select: { studentId: true }
    });
    const paidIds = [...new Set(paidStudents.map(p => p.studentId))];

    // 2. CRM එකේ ඉන්න අයගේ IDs ගන්න (Student ID එකට අදාලව)
    const crmLeads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR' },
        select: { id: true, name: true } // ඔයාගේ table එකේ studentId relation එකක් තියෙනවද බලන්න
    });

    console.log(`Payment Table Total Distinct Students: ${paidIds.length}`);
    console.log(`CRM Lead Table Total Leads: ${crmLeads.length}`);
}
findMismatch();