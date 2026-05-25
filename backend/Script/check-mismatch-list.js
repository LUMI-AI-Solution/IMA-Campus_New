const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// මෙතන ඔයාට ඕනේ Business ID එක දෙන්න (උදා: 1)
const TARGET_BUSINESS_ID = 1; 

async function getMismatchList() {
    console.log(`🔍 Checking Mismatches for Business ID: ${TARGET_BUSINESS_ID}...`);

    // 1. අදාල Business එකේ විතරක් Verified Payments ගන්න
    const verifiedPayments = await prisma.payment.findMany({
        where: { 
            businessId: TARGET_BUSINESS_ID,
            status: { in: [1, 4] } 
        },
        select: { student: { select: { phone: true, whatsapp: true, firstName: true } } }
    });

    const verifiedPhones = new Set();
    verifiedPayments.forEach(p => {
        if (p.student) {
            const p1 = (p.student.phone || '').replace(/[^0-9]/g, '');
            const p2 = (p.student.whatsapp || '').replace(/[^0-9]/g, '');
            // අන්තිම ඉලක්කම් 9 ගන්නවා
            if (p1.length >= 9) verifiedPhones.add(p1.slice(-9));
            if (p2.length >= 9) verifiedPhones.add(p2.slice(-9));
        }
    });

    // 2. අදාල Business එකට අදාල CRM Leads විතරක් ගන්න
    // (phone එකේ _BIZ_{TARGET_BUSINESS_ID} තියෙන අය විතරක්)
    const crmLeads = await prisma.lead.findMany({
        where: { 
            campaignType: 'AFTER_SEMINAR',
            phone: { contains: `_BIZ_${TARGET_BUSINESS_ID}` } 
        },
        select: { phone: true, name: true, enrollmentStatus: true }
    });

    console.log(`📊 Verified Students in BIZ_${TARGET_BUSINESS_ID}: ${verifiedPhones.size}`);
    console.log(`📊 CRM Leads in BIZ_${TARGET_BUSINESS_ID}: ${crmLeads.length}`);

    console.log("--- Missing List (Payment එකේ ඉන්න, හැබැයි මේ Business එකේ CRM එකේ නැති අය) ---");
    
    verifiedPhones.forEach(phone => {
        const found = crmLeads.find(l => {
            const lp = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            return lp.slice(-9) === phone;
        });

        if (!found) {
            console.log(`⚠️ Missing in CRM BIZ_${TARGET_BUSINESS_ID}: ${phone}`);
        }
    });
}

getMismatchList().finally(() => prisma.$disconnect());