const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullPaymentCourseLogic(inputCourseIds) {
    let courseIdArrayNumber = inputCourseIds.map(id => Number(id));
    
    // Fetch info about these courses
    const courses = await prisma.course.findMany({
        where: { id: { in: courseIdArrayNumber } },
        include: { group: true }
    });

    let additionalCourseIds = [];

    for (const course of courses) {
        if (course.group && course.group.type === 2) { // Full Payment Group
            console.log(`Course ${course.name} (ID: ${course.id}) is a Full Payment course! Group: ${course.group.name}, Batch: ${course.group.batchId}`);
            
            // Find all other courses in the same batch with the same subject name
            const relatedCourses = await prisma.course.findMany({
                where: {
                    name: course.name,
                    group: {
                        batchId: course.group.batchId
                    }
                },
                select: { id: true }
            });
            
            const relatedIds = relatedCourses.map(rc => Number(rc.id));
            additionalCourseIds = [...additionalCourseIds, ...relatedIds];
            console.log(`Found ${relatedIds.length} related monthly courses for subject ${course.name}`);
        }
    }

    // Combine and remove duplicates
    const finalCourseIds = [...new Set([...courseIdArrayNumber, ...additionalCourseIds])];
    
    console.log("Final Course ID Array (Ints):", finalCourseIds);
    console.log("Final Course ID Array (BigInts):", finalCourseIds.map(id => BigInt(id)));
}

testFullPaymentCourseLogic([532]).catch(console.error).finally(() => prisma.$disconnect());
