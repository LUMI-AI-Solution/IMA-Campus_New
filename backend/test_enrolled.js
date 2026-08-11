const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    if (batchId === 'UNASSIGNED') {
        whereClause.batchId = null;
    } else if (batchId && batchId !== '' && batchId !== 'ALL') {
        whereClause.batchId = parseInt(batchId);
    } else if (businessId && businessId !== '' && businessId !== 'ALL') {
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${businessId}` } },
            { phone: { endsWith: `_BIZ_${businessId}_AS` } },
            { phone: { contains: `_BIZ_${businessId}_BATCH_` } },
            { phone: { contains: `_BIZ_${businessId}_ROUND_` } },
            { phone: { contains: `_BIZ_${businessId}_HISTORY_ROUND_` } }
        ];
    }
    return whereClause;
};

async function testEnrolled() {
    console.log("Fetching payments...");
    const verifiedPayments = await prisma.payment.findMany({
        where: { status: { in: [1, 4] } },
        include: { student: true, batch: true }
    });

    console.log("Verified payments:", verifiedPayments.length);
    
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
    const studentIdMap = {};
    verifiedPayments.forEach(p => {
        if (p.student) {
            const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
            relatedSuffixes.forEach(suffix => {
                verifiedPhones.add(suffix);
                studentIdMap[suffix] = p.student.id;
            });
        }
    });
    verifiedPhones.studentIdMap = studentIdMap;

    const whereClause = buildStatsWhereClause('1', 'ALL', null, null, { campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] } });
    const allLeads = await prisma.lead.findMany({
        where: whereClause,
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

    console.log("Primary enrolled leads:", primaryLeadIds.size);
}
testEnrolled();
