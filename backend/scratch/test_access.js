const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAccess() {
    const studentId = 132;
    const validPayments = await prisma.payment.findMany({
        where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
    });
    console.log("Valid Payments:", validPayments.map(p => ({ id: p.id, batchId: p.batchId, subjects: p.subjects, status: p.status })));
    
    // Simulate what gets returned
    const validBatchIds = [...new Set(validPayments.map(p => p.batchId).filter(Boolean))];
    let validGroupIds = [...new Set(validPayments.map(p => p.groupId).filter(Boolean))];

    let allowedSubjectIds = [];
    validPayments.forEach(p => {
        if (p.subjects) {
            try {
                const subs = JSON.parse(p.subjects);
                allowedSubjectIds = [...allowedSubjectIds, ...subs.map(id => parseInt(id))];
            } catch (e) {}
        }
    });
    
    console.log("Allowed Subjects:", allowedSubjectIds);
}

testAccess().finally(() => prisma.$disconnect());
