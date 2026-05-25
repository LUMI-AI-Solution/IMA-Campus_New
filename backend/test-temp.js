const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const bizId = 1;
        
        // Fetch verified student phone numbers
        const paymentWhere = { status: { in: [1, 4] }, businessId: bizId };
        const verifiedPayments = await prisma.payment.findMany({
            where: paymentWhere,
            select: { student: { select: { phone: true, whatsapp: true } } }
        });

        const verifiedPhones = new Set();
        verifiedPayments.forEach(p => {
            if (p.student) {
                const p1 = (p.student.phone || '').replace(/[^0-9]/g, '');
                const p2 = (p.student.whatsapp || '').replace(/[^0-9]/g, '');
                if (p1.length >= 9) verifiedPhones.add(p1.slice(-9));
                if (p2.length >= 9) verifiedPhones.add(p2.slice(-9));
            }
        });

        console.log("=== Database Stats Mapped to Verified Payments ===");
        console.log("Total Verified Phones in Payments:", verifiedPhones.size);

        // Open Seminar Leads
        const openSemLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
                OR: [
                    { phone: { endsWith: `_BIZ_${bizId}` } },
                    { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                    { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
                ]
            }
        });
        
        let openSemEnrolledVerified = 0;
        openSemLeads.forEach(l => {
            if (!l.phone) return;
            const clean = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (clean.length >= 9 && verifiedPhones.has(clean.slice(-9))) {
                openSemEnrolledVerified++;
            }
        });

        // New Inquiries Leads
        const newInqLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                inquiryType: 'NEW_INQ',
                OR: [
                    { phone: { endsWith: `_BIZ_${bizId}` } },
                    { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                    { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
                ]
            }
        });

        let newInqEnrolledVerified = 0;
        newInqLeads.forEach(l => {
            if (!l.phone) return;
            const clean = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (clean.length >= 9 && verifiedPhones.has(clean.slice(-9))) {
                newInqEnrolledVerified++;
            }
        });

        // Bridge Transfers Leads
        const bridgeLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                source: 'bridge_transfer',
                OR: [
                    { phone: { endsWith: `_BIZ_${bizId}` } },
                    { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                    { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
                ]
            }
        });

        let bridgeEnrolledVerified = 0;
        bridgeLeads.forEach(l => {
            if (!l.phone) return;
            const clean = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (clean.length >= 9 && verifiedPhones.has(clean.slice(-9))) {
                bridgeEnrolledVerified++;
            }
        });

        console.log("Verified Enrolled counts under new backend calculation logic:");
        console.log("- Open Seminar Enrolled (Verified Payments Only):", openSemEnrolledVerified);
        console.log("- New Inquiries Enrolled (Verified Payments Only):", newInqEnrolledVerified);
        console.log("- Bridge Transfers Enrolled (Verified Payments Only):", bridgeEnrolledVerified);
        
        const sum = openSemEnrolledVerified + newInqEnrolledVerified + bridgeEnrolledVerified;
        console.log("- Sum of verified enrolled leads across campaigns:", sum);

        // Find how many unique verified students are not in the leads list (Direct Signups)
        const leads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                OR: [
                    { phone: { endsWith: `_BIZ_${bizId}` } },
                    { phone: { endsWith: `_BIZ_${bizId}_AS` } },
                    { phone: { contains: `_BIZ_${bizId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${bizId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${bizId}_HISTORY_ROUND_` } }
                ]
            }
        });
        const cleanPhoneToLeadMap = {};
        leads.forEach(l => {
            if (!l.phone) return;
            const cleanLeadPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (cleanLeadPhone.length >= 9) {
                cleanPhoneToLeadMap[cleanLeadPhone.slice(-9)] = l;
            }
        });

        let directSignupsCount = 0;
        verifiedPhones.forEach(ph => {
            if (!cleanPhoneToLeadMap[ph]) {
                directSignupsCount++;
            }
        });

        console.log("- Direct Signups (No CRM Record):", directSignupsCount);
        console.log("- Grand Total Enrolled (Sum + Direct Signups):", sum + directSignupsCount);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
