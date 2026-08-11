const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getVerifiedPhones() {
    const verifiedPayments = await prisma.payment.findMany({
        where: { status: { in: [1, 4] } },
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
        const sid = stu.id;

        const matches = relatedStudents.filter(other => {
            if (other.id === sid) return true;
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
                if (cleanPh.length >= 7) {
                    phoneSuffixes.add(cleanPh.slice(-7));
                }
            });
        });

        studentIdToRelatedPhonesMap[stu.id] = phoneSuffixes;
    });

    const verifiedPhones = new Set();
    const phoneSuffixToStudentId = {};
    verifiedPayments.forEach(p => {
        if (p.student) {
            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            relatedSuffixes.forEach(suffix => {
                verifiedPhones.add(suffix);
                phoneSuffixToStudentId[suffix] = p.student.id;
            });
        }
    });

    verifiedPhones.studentIdMap = phoneSuffixToStudentId;
    return verifiedPhones;
}

async function getPrimaryEnrolledLeadIds(verifiedPhones) {
    const allLeads = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR' },
        select: { id: true, phone: true, createdAt: true }
    });

    const phoneSuffixToStudentId = verifiedPhones.studentIdMap || {};
    const studentToLeads = {};
    allLeads.forEach(l => {
        const cleanPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
        if (cleanPhone.length >= 7 && verifiedPhones.has(cleanPhone.slice(-7))) {
            const studentId = phoneSuffixToStudentId[cleanPhone.slice(-7)];
            if (studentId) {
                if (!studentToLeads[studentId]) studentToLeads[studentId] = [];
                studentToLeads[studentId].push(l);
            }
        }
    });

    const primaryLeadIds = new Set();
    Object.values(studentToLeads).forEach(group => {
        group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        primaryLeadIds.add(group[0].id);
    });

    return primaryLeadIds;
}

async function main() {
    console.log("Fetching verified payments and leads for NEW INQUIRIES...");
    const verifiedPhones = await getVerifiedPhones();
    const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(verifiedPhones);

    console.log(`Found ${primaryEnrolledLeadIds.size} primary enrolled leads from payments.`);

    // Target all leads in New Inquiries Round 1 and Round 2
    const leadsToProcess = await prisma.lead.findMany({
        where: {
            newInqRound: { in: [1, 2] },
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'NEW_INQ',
            enrollmentStatus: { notIn: ['ENROLLED', 'PAID'] }
        }
    });

    console.log(`Found ${leadsToProcess.length} leads stuck in Round 1 and Round 2 for New Inquiries.`);

    let movedToPaid = 0;
    let movedToNonEnrolled = 0;

    for (let lead of leadsToProcess) {
        const isPaid = primaryEnrolledLeadIds.has(lead.id);

        if (isPaid) {
            // Move to PAID
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    enrollmentStatus: 'ENROLLED',
                    newInqRound: 3, // Push past R1/R2
                    assignedAt: new Date() // Reset delay timer just in case
                }
            });
            movedToPaid++;
        } else {
            // Move to NON ENROLLED
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    enrollmentStatus: 'NON_ENROLLED',
                    newInqRound: 3, // R3 is non enrolled
                    newInqCallStatus: 'pending', // Make them pending in non enrolled
                    assignedAt: new Date() // Reset delay timer for the new round
                }
            });
            movedToNonEnrolled++;
        }
    }

    console.log(`✅ Successfully moved ${movedToPaid} NEW INQ leads to PAID.`);
    console.log(`✅ Successfully moved ${movedToNonEnrolled} NEW INQ leads to NON ENROLLED.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
