const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testKPI() {
    const batchId = 26;
    const leads = await prisma.lead.findMany({
        where: { batchId: batchId, campaignType: 'AFTER_SEMINAR', assignedTo: { not: null } },
        include: { assignedUser: true, messages: true }
    });
    
    let sentCount = 0;
    leads.forEach(l => {
        l.messages.forEach(m => {
            const dir = m.direction ? m.direction.toLowerCase() : '';
            if (dir === 'out' || dir === 'outbound') sentCount++;
        });
    });
    console.log(`Sent Messages found: ${sentCount}`);

    const enrolledLeads = leads.filter(l => l.enrollmentStatus === 'ENROLLED');
    
    const cleanPhoneMap = {};
    const cleanPhones = [];
    
    enrolledLeads.forEach(l => {
        let clean = l.phone.split('_')[0];
        if (clean.startsWith('94')) clean = '0' + clean.substring(2);
        cleanPhones.push(clean);
        cleanPhoneMap[l.phone] = clean;
    });

    const students = await prisma.user.findMany({
        where: { phone: { in: cleanPhones } },
        select: { id: true, phone: true }
    });
    
    console.log(`Matched ${students.length} students after phone cleaning.`);

    const studentIds = students.map(s => s.id);
    const payments = await prisma.payment.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { created_at: 'desc' }
    });
    
    console.log(`Found ${payments.length} payments.`);
}

testKPI().catch(console.error).finally(() => prisma.$disconnect());
