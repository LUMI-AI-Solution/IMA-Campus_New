const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLast9Digits = (phone) => {
    if (!phone) return '';
    const basePhone = String(phone).split('_')[0];
    const cleaned = basePhone.replace(/[^0-9]/g, '');
    return cleaned.slice(-9);
};

async function main() {
    // Assuming 2027 Tech May Batch is the target, let's find its ID
    const batch = await prisma.batch.findFirst({ where: { name: { contains: '2027 Tech May Batch' } } });
    if (!batch) return console.log("Batch not found");
    
    console.log("Batch ID:", batch.id);
    
    const paymentWhere = { batchId: batch.id, status: { in: [1, 4] } };
    const verifiedPayments = await prisma.payment.findMany({
        where: paymentWhere,
        include: { student: true }
    });
    
    const verifiedStudentNics = [];
    const verifiedStudentPhones = [];
    verifiedPayments.forEach(p => {
        if (p.student) {
            if (p.student.nic) verifiedStudentNics.push(p.student.nic.trim());
            if (p.student.phone) verifiedStudentPhones.push(p.student.phone);
            if (p.student.whatsapp) verifiedStudentPhones.push(p.student.whatsapp);
            if (p.student.optionalPhone) verifiedStudentPhones.push(p.student.optionalPhone);
        }
    });

    const relatedStudents = await prisma.user.findMany({
        where: {
            role: { in: ['Student', 'USER', 'user', 'student', 'STUDENT'] },
            OR: [
                { nic: { in: verifiedStudentNics.filter(Boolean) } },
                { phone: { in: verifiedStudentPhones.filter(Boolean) } },
                { whatsapp: { in: verifiedStudentPhones.filter(Boolean) } },
                { optionalPhone: { in: verifiedStudentPhones.filter(Boolean) } }
            ]
        }
    });

    const studentIdToRelatedPhonesMap = {};
    verifiedPayments.forEach(p => {
        if (!p.student) return;
        const stu = p.student;
        const matches = relatedStudents.filter(other => {
            if (other.id === stu.id) return true;
            if (stu.nic && other.nic && stu.nic.trim() === other.nic.trim()) return true;
            const stuNumSet = new Set([stu.phone, stu.whatsapp, stu.optionalPhone].filter(Boolean));
            const otherNumSet = new Set([other.phone, other.whatsapp, other.optionalPhone].filter(Boolean));
            for (let num of stuNumSet) {
                if (otherNumSet.has(num)) return true;
            }
            return false;
        });

        const phoneSuffixes = new Set();
        matches.forEach(m => {
            [m.phone, m.whatsapp, m.optionalPhone].forEach(ph => {
                if (!ph) return;
                const cleanPh = ph.replace(/[^0-9]/g, '');
                if (cleanPh.length >= 7) phoneSuffixes.add(cleanPh.slice(-7));
            });
        });
        studentIdToRelatedPhonesMap[stu.id] = phoneSuffixes;
    });

    const verifiedPhones = new Set();
    verifiedPayments.forEach(p => {
        if (p.student) {
            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            relatedSuffixes.forEach(suffix => verifiedPhones.add(suffix));
        }
    });

    const leads = await prisma.lead.findMany({
        where: { batchId: batch.id, campaignType: 'AFTER_SEMINAR', source: { not: 'system' } }
    });

    let openSem = 0, newInq = 0, bridge = 0;
    
    leads.forEach(l => {
        const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
        const isReallyEnrolled = cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7));
        if (isReallyEnrolled) {
            if (l.source === 'bridge_transfer') bridge++;
            else if (l.inquiryType === 'NEW_INQ') newInq++;
            else openSem++;
        }
    });

    console.log(`Enrolled in Bridge: ${bridge}`);
    console.log(`Enrolled in New Inq: ${newInq}`);
    console.log(`Enrolled in Open Sem: ${openSem}`);
    console.log(`Total Leads Enrolled: ${bridge + newInq + openSem}`);
    
    // Retention style
    const crmLeadPhones = new Set(leads.map(l => getLast9Digits(l.phone)));
    const paymentStudentsMap = new Map();
    verifiedPayments.forEach(p => { if (p.student) paymentStudentsMap.set(p.student.id, p.student); });
    
    let inCrmCount = 0;
    paymentStudentsMap.forEach(student => {
        const studentLast9 = getLast9Digits(student.phone || student.whatsapp);
        if (studentLast9 && crmLeadPhones.has(studentLast9)) {
            inCrmCount++;
        }
    });
    console.log(`inCrmCount (Retention method): ${inCrmCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
