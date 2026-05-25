const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMismatch() {
    console.log("🔍 Checking Mismatches...");

    // 1. Payment table එකේ ඉන්න Verified අයගේ Phone Numbers ටික ගන්නවා
    const verifiedPayments = await prisma.payment.findMany({
        where: { status: { in: [1, 4] } },
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

    // 2. CRM Leads ටික ගන්නවා
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR' },
        select: { phone: true, name: true, enrollmentStatus: true }
    });

    // 3. Compare කරන්න
    let crmEnrolledCount = 0;
    let notInCrm = [];

    leads.forEach(l => {
        const basePhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
        const shortPhone = basePhone.length >= 9 ? basePhone.slice(-9) : basePhone;
        
        if (l.enrollmentStatus === 'ENROLLED') crmEnrolledCount++;
    });

    console.log("----------------------------------");
    console.log(`📊 Total Verified Payments (Students): ${verifiedPhones.size}`);
    console.log(`📊 CRM Leads marked as ENROLLED: ${crmEnrolledCount}`);
    console.log("----------------------------------");
    
    if (verifiedPhones.size !== crmEnrolledCount) {
        console.log("⚠️ Mismatch detected!");
        console.log("👉 හේතුව: Payment Table එකේ එකම ළමයාට payments කීපයක් තියෙනවා වෙන්න පුළුවන් (DISTINCT කරලා නෑ).");
        console.log("👉 එහෙමත් නැත්නම් CRM එකේ ළමයි එළියට දානකොට 'bridge_transfer' කියලා filter කරලා අයින් කරනවා.");
    }
}

checkMismatch()
    .catch(console.error)
    .finally(() => prisma.$disconnect());