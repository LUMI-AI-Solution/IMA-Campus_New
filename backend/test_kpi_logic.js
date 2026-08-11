const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testKPI() {
    const batchId = 26; // Example batch ID (I saw 26 in earlier logs)
    
    // Fetch leads for a coordinator
    const leads = await prisma.lead.findMany({
        where: { batchId: batchId, campaignType: 'AFTER_SEMINAR', assignedTo: { not: null } },
        include: {
            assignedUser: { select: { id: true, firstName: true } },
            messages: true
        }
    });
    
    console.log(`Found ${leads.length} leads assigned to coordinators.`);
    if (leads.length === 0) return;
    
    // Check messaging
    let sentCount = 0;
    let outDirections = new Set();
    leads.forEach(l => {
        l.messages.forEach(m => {
            outDirections.add(m.direction);
            if (m.direction === 'OUT') sentCount++;
        });
    });
    console.log(`Sent Messages (direction === 'OUT'): ${sentCount}`);
    console.log(`All message directions found:`, Array.from(outDirections));

    // Check Enrollments and Payments
    const enrolledLeads = leads.filter(l => l.enrollmentStatus === 'ENROLLED');
    console.log(`Enrolled Leads: ${enrolledLeads.length}`);
    
    const enrolledPhones = enrolledLeads.map(l => l.phone);
    console.log("Sample enrolled lead phones:", enrolledPhones.slice(0, 3));
    
    const students = await prisma.user.findMany({
        where: { phone: { in: enrolledPhones } },
        select: { id: true, phone: true }
    });
    console.log(`Matched ${students.length} students by exact phone match.`);
    
    // Check if phone matching is the issue (e.g., format difference)
    if (students.length === 0 && enrolledLeads.length > 0) {
        console.log("Phone matching failed. Let's try matching with 'endsWith' or trimming.");
        // Try one
        const sampleLeadPhone = enrolledPhones[0];
        const studentTry = await prisma.user.findFirst({ where: { phone: { contains: sampleLeadPhone.slice(-9) } } });
        if (studentTry) console.log(`Found student using contains: LeadPhone=${sampleLeadPhone}, StudentPhone=${studentTry.phone}`);
    }

    const studentIds = students.map(s => s.id);
    const payments = await prisma.payment.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { created_at: 'desc' }
    });
    
    console.log(`Found ${payments.length} payments for these students.`);
    if (payments.length > 0) {
        console.log("Sample Payment subjects field:", payments[0].subjects);
        console.log("Sample Payment payment_type field:", payments[0].payment_type);
    }
}

testKPI().catch(console.error).finally(() => prisma.$disconnect());
