const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndClone(sourceBatchId, targetBatchId) {
    console.log(`\n--- Cleaning up Target Batch ${targetBatchId} ---`);
    
    // Delete existing groups, courses, content groups for the target batch
    const groups = await prisma.group.findMany({ where: { batchId: targetBatchId } });
    const groupIds = groups.map(g => g.id);
    if (groupIds.length > 0) {
        await prisma.course.deleteMany({ where: { groupId: { in: groupIds } } });
        await prisma.group.deleteMany({ where: { batchId: targetBatchId } });
    }

    const cgs = await prisma.contentGroup.findMany({ where: { batchId: targetBatchId } });
    const cgIds = cgs.map(cg => cg.id);
    if (cgIds.length > 0) {
        await prisma.content.deleteMany({ where: { contentGroupId: { in: cgIds } } });
        await prisma.contentGroup.deleteMany({ where: { batchId: targetBatchId } });
    }

    console.log(`--- Cloning from Batch ${sourceBatchId} to Batch ${targetBatchId} ---`);
    
    // 1. Clone Groups
    const sourceGroups = await prisma.group.findMany({
        where: { batchId: sourceBatchId },
        include: { courses: true }
    });

    const courseMap = {}; // Maps oldCourseId -> newCourseId

    for (const oldGroup of sourceGroups) {
        const newGroup = await prisma.group.create({
            data: {
                name: oldGroup.name,
                type: oldGroup.type,
                itemOrder: oldGroup.itemOrder,
                discount_rules: oldGroup.discount_rules,
                batchId: targetBatchId
            }
        });

        for (const oldCourse of oldGroup.courses) {
            const newCourse = await prisma.course.create({
                data: {
                    name: oldCourse.name,
                    code: oldCourse.code,
                    stream: oldCourse.stream,
                    streams: oldCourse.streams,
                    description: oldCourse.description,
                    itemOrder: oldCourse.itemOrder,
                    courseType: oldCourse.courseType,
                    price: oldCourse.price,
                    groupPrices: oldCourse.groupPrices,
                    isDiscountExcluded: oldCourse.isDiscountExcluded,
                    lecturerName: oldCourse.lecturerName,
                    activeMonths: oldCourse.activeMonths,
                    startMonth: oldCourse.startMonth,
                    endMonth: oldCourse.endMonth,
                    groupId: newGroup.id
                }
            });
            courseMap[oldCourse.id] = newCourse.id;
        }
    }

    // 2. Clone ContentGroups and Contents
    const sourceContentGroups = await prisma.contentGroup.findMany({
        where: { batchId: sourceBatchId },
        include: { contents: true }
    });

    for (const oldCg of sourceContentGroups) {
        const newCg = await prisma.contentGroup.create({
            data: {
                title: oldCg.title,
                type: oldCg.type,
                itemOrder: oldCg.itemOrder,
                courseCode: oldCg.courseCode,
                batchId: targetBatchId
            }
        });

        for (const oldContent of oldCg.contents) {
            let mappedCourseId = oldContent.courseId; // Default to old (e.g. 0)
            if (oldContent.courseId !== 0 && oldContent.courseId !== null) {
                mappedCourseId = courseMap[oldContent.courseId];
                if (!mappedCourseId) {
                    console.warn(`  Warning: Content '${oldContent.title}' references an unmapped courseId (${oldContent.courseId}). Using original.`);
                    mappedCourseId = oldContent.courseId; // Fallback just in case
                }
            }

            await prisma.content.create({
                data: {
                    title: oldContent.title,
                    contentType: oldContent.contentType,
                    link: oldContent.link,
                    youtubeLink: oldContent.youtubeLink,
                    vimeoLink: oldContent.vimeoLink,
                    fileName: oldContent.fileName,
                    meetingId: oldContent.meetingId,
                    thumbnail: oldContent.thumbnail,
                    date: oldContent.date,
                    startTime: oldContent.startTime,
                    endTime: oldContent.endTime,
                    paperTime: oldContent.paperTime,
                    questionCount: oldContent.questionCount,
                    isFree: oldContent.isFree,
                    autoDeleteHours: oldContent.autoDeleteHours,
                    reminderSent: false,
                    itemOrder: oldContent.itemOrder,
                    
                    contentGroupId: newCg.id,
                    batchId: targetBatchId,
                    courseId: mappedCourseId
                }
            });
        }
    }
}

async function run() {
    try {
        const sourceBatchId = 20;
        const targetBatchIds = [41, 45];
        for (const targetId of targetBatchIds) {
            await cleanupAndClone(sourceBatchId, targetId);
        }
        console.log("All cloning operations completed successfully.");
    } catch (error) {
        console.error("Error during cloning:", error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
