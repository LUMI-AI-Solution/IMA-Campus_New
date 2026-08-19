const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // History course in Batch 41 is 815 or 851.
    const courseId = 815; 
    const studentId = 1; // dummy, doesn't matter for fetching contents if we simulate full payment
    
    const requestedCourse = await prisma.course.findUnique({
        where: { id: courseId },
        include: { group: true }
    });

    const batchId = requestedCourse.group.batchId;
    
    // Simulate similar courses
    const similarCourses = await prisma.course.findMany({
        where: {
            OR: [
                requestedCourse.code ? { code: requestedCourse.code } : undefined,
                { name: requestedCourse.name }
            ].filter(Boolean),
            group: { batchId: batchId }
        }
    });
    
    const targetCourseIds = similarCourses.map(c => BigInt(c.id));
    
    const linkedContents = await prisma.contentCourse.findMany({
        where: { course_id: { in: targetCourseIds } }
    });
    
    const contentIds = linkedContents.map(lc => lc.content_id);
    
    const contentsRaw = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: { group: true },
        orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Contents for simulated course ${courseId} (History in Batch 41):`);
    contentsRaw.forEach(c => console.log(c.id, c.title));
}
main().catch(console.error).finally(() => prisma.$disconnect());
