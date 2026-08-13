const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLast9Digits = (phone) => {
    if (!phone) return '';
    const basePhone = String(phone).split('_')[0];
    const cleaned = basePhone.replace(/[^0-9]/g, '');
    return cleaned.slice(-9);
};

async function run() {
    const batchNameStr = "2027 MAY Intake";
    const batch = await prisma.batch.findFirst({ where: { name: { contains: batchNameStr } } });
    
    const req = {
        query: {
            businessId: '1',
            batchId: batch.id.toString(),
            targetMonthName: 'Monthly Payment - MAY'
        }
    };
    
    const { businessId, batchId, targetMonthName } = req.query;
    
    const allGroups = await prisma.group.findMany({
        where: { batchId: parseInt(batchId) },
        orderBy: { itemOrder: 'asc' }
    });
    const monthlyGroupsRaw = allGroups.filter(g => !g.name.toLowerCase().includes('full'));
    const uniqueGroupNames = [...new Set(monthlyGroupsRaw.map(g => g.name))];
    const distinctMonthlyGroups = uniqueGroupNames.map(name => {
        const matchingGroups = monthlyGroupsRaw.filter(g => g.name === name);
        return { name: name, ids: matchingGroups.map(g => g.id) };
    });

    let activeGroupName = targetMonthName;
    let activeGroupIndex = distinctMonthlyGroups.findIndex(g => g.name.toUpperCase() === activeGroupName.toUpperCase());
    if (activeGroupIndex === -1) activeGroupIndex = distinctMonthlyGroups.length - 1;

    const payments = await prisma.payment.findMany({
        where: { batchId: parseInt(batchId), status: { in: [0, 1, 2, 4] }, student: { phone: { contains: '770859213' } } },
        select: { id: true, payment_type: true, groupId: true, subjects: true, status: true, student: { select: { phone: true } } }
    });
    
    const leads = await prisma.lead.findMany({
        where: { batchId: parseInt(batchId), phone: { contains: '770859213' } }
    });
    
    const courses = await prisma.course.findMany({ select: { id: true, name: true } });
    const courseMap = {};
    courses.forEach(c => { courseMap[c.id] = c.name; });

    const l = leads[0];
    
    const studentPayments = payments;
    
    let baseSubjects = new Set();
    studentPayments.forEach(p => {
        if (p.subjects) {
            try {
                const subs = JSON.parse(p.subjects);
                subs.forEach(item => {
                    let subName = null;
                    if (typeof item === 'object' && item.id && courseMap[parseInt(item.id)]) subName = courseMap[parseInt(item.id)];
                    else if (typeof item === 'string' && isNaN(parseInt(item))) subName = item.trim().toUpperCase();
                    else if (!isNaN(parseInt(item)) && courseMap[parseInt(item)]) subName = courseMap[parseInt(item)];
                    else if (typeof item === 'number' && courseMap[item]) subName = courseMap[item];
                    
                    if (subName) baseSubjects.add(subName);
                });
            } catch(e) {}
        }
    });
    
    let earliestGroupIndex = distinctMonthlyGroups.length;
    studentPayments.forEach(p => {
        if (p.payment_type === 3 || p.payment_type === 2) {
            earliestGroupIndex = 0;
        } else if (p.groupId) {
            let gIndex = distinctMonthlyGroups.findIndex(g => g.ids.includes(p.groupId));
            if (gIndex !== -1 && gIndex < earliestGroupIndex) {
                earliestGroupIndex = gIndex;
            }
        }
    });
    if (earliestGroupIndex === distinctMonthlyGroups.length) earliestGroupIndex = 0; 
    
    let paymentHistory = {};
    let startHistoryIndex = Math.max(0, activeGroupIndex - 2);
    
    baseSubjects.forEach(subjectName => {
        paymentHistory[subjectName] = {};
        for (let i = startHistoryIndex; i <= activeGroupIndex; i++) {
            const group = distinctMonthlyGroups[i];
            let status = 'NOT PAID';
            let relevantPayments = studentPayments.filter(p => {
                let hasSub = false;
                if (p.subjects) {
                    try {
                        const subs = JSON.parse(p.subjects);
                        hasSub = subs.some(item => {
                            let sName = null;
                            if (typeof item === 'object' && item.id) sName = courseMap[parseInt(item.id)];
                            else if (typeof item === 'string' && isNaN(parseInt(item))) sName = item.trim().toUpperCase();
                            else if (!isNaN(parseInt(item))) sName = courseMap[parseInt(item)];
                            else if (typeof item === 'number' && courseMap[item]) sName = courseMap[item];
                            return sName === subjectName;
                        });
                    } catch(e) {}
                } else {
                    hasSub = true;
                }
                if (hasSub && (p.payment_type === 3 || p.payment_type === 2 || group.ids.includes(p.groupId))) {
                    return true;
                }
                return false;
            });
            if (relevantPayments.some(p => [1, 4].includes(p.status))) status = 'PAID';
            else if (relevantPayments.some(p => p.status === 0)) status = 'PROCESSING';
            paymentHistory[subjectName][group.name] = status;
        }
    });

    let prevGroupIndex = activeGroupIndex - 1;
    let prevGroup = prevGroupIndex >= 0 ? distinctMonthlyGroups[prevGroupIndex] : null;
    let activeGroup = distinctMonthlyGroups[activeGroupIndex];

    let prevGroupPaidSubjects = [];
    let activeGroupPaidSubjects = [];
    let newlyDroppedSubjects = [];

    baseSubjects.forEach(subjectName => {
        const activeStatus = paymentHistory[subjectName]?.[activeGroup?.name];
        if (activeStatus === 'PAID') activeGroupPaidSubjects.push(subjectName);
        if (prevGroup) {
            const prevStatus = paymentHistory[subjectName]?.[prevGroup.name];
            if (prevStatus === 'PAID') prevGroupPaidSubjects.push(subjectName);
        }
        if (prevGroupPaidSubjects.includes(subjectName) && !activeGroupPaidSubjects.includes(subjectName)) newlyDroppedSubjects.push(subjectName);
    });

    let isEnrolled = false;
    let isNonEnrolled = false;
    const hasApprovedFull = false; 
    if (hasApprovedFull) isEnrolled = true;
    else if (activeGroupPaidSubjects.length > 0 && newlyDroppedSubjects.length === 0) isEnrolled = true;
    else if (newlyDroppedSubjects.length > 0) isNonEnrolled = true;
    else if (prevGroupPaidSubjects.length === 0 && activeGroupPaidSubjects.length === 0) isNonEnrolled = true;
    else isEnrolled = activeGroupPaidSubjects.length > 0;

    console.log({
        activeGroupName, activeGroupIndex, earliestGroupIndex,
        baseSubjects: Array.from(baseSubjects),
        paymentHistory, activeGroupPaidSubjects, newlyDroppedSubjects,
        enrollmentStatus: isEnrolled ? 'ENROLLED' : 'NON_ENROLLED'
    });
    
    process.exit(0);
}
run();
