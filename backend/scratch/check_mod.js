const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentId = 1193;
    const batchId = 18;
    const requestedCourse = await prisma.course.findUnique({
        where: { id: 149 },
        include: { group: true }
    });

    console.log("Requested Course:", requestedCourse.name, requestedCourse.code);

    const fullPayments = await prisma.payment.findMany({
        where: {
            studentId,
            batchId,
            payment_type: { in: [2, 3] },
            status: { in: [1, 4] }
        }
    });

    console.log("Full payments count:", fullPayments.length);
    let targetCourseIds = [BigInt(149)];

    if (fullPayments.length > 0) {
        const similarCourses = await prisma.course.findMany({
            where: {
                OR: [
                    requestedCourse.code ? { code: requestedCourse.code } : undefined,
                    { name: requestedCourse.name }
                ].filter(Boolean),
                group: { batchId: batchId }
            }
        });
        console.log("Similar courses count:", similarCourses.length, similarCourses.map(c => c.id));
        const similarCourseIds = similarCourses.map(c => parseInt(c.id));
        
        const validFullPayments = fullPayments.filter(p => {
            if (!p.subjects) return true;
            try {
                const subs = JSON.parse(p.subjects).map(s => parseInt(s));
                return subs.some(subId => similarCourseIds.includes(subId));
            } catch (e) {
                return true;
            }
        });
        console.log("Valid full payments count:", validFullPayments.length);

        if (validFullPayments.length > 0) {
            targetCourseIds = similarCourses.map(c => BigInt(c.id));
        }
    }

    console.log("Target course IDs:", targetCourseIds);

    const linkedContents = await prisma.contentCourse.findMany({
        where: { course_id: { in: targetCourseIds } }
    });
    console.log("Linked contents count:", linkedContents.length);
    
    const contentIds = linkedContents.map(lc => lc.content_id);
    
    const contentsRaw = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: { group: true },
        orderBy: { createdAt: 'desc' }
    });
    console.log("Contents count:", contentsRaw.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
