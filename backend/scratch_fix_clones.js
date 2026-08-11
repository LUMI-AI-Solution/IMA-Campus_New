const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClones() {
    const sourceBatchId = 20;
    const targetBatchIds = [41, 45];
    
    // Get source batch lecturers
    const sourceBatch = await prisma.batch.findUnique({ where: { id: sourceBatchId } });
    
    for (const targetId of targetBatchIds) {
        console.log(`Fixing Batch ${targetId}...`);
        
        // 1. Fix lecturers
        await prisma.batch.update({
            where: { id: targetId },
            data: { lecturers: sourceBatch.lecturers }
        });
        
        // 2. Build group mapping based on name
        const sourceGroups = await prisma.group.findMany({ where: { batchId: sourceBatchId } });
        const targetGroups = await prisma.group.findMany({ where: { batchId: targetId } });
        
        // Map oldGroupId -> newGroupId
        const groupMap = {};
        for (const oldGroup of sourceGroups) {
            const newGroup = targetGroups.find(g => g.name === oldGroup.name);
            if (newGroup) {
                groupMap[oldGroup.id] = newGroup.id;
            }
        }
        
        // 3. Fix groupPrices in courses
        const targetCourses = await prisma.course.findMany({
            where: { group: { batchId: targetId } }
        });
        
        for (const course of targetCourses) {
            if (course.groupPrices) {
                try {
                    let parsed = JSON.parse(course.groupPrices);
                    let changed = false;
                    
                    parsed = parsed.map(gp => {
                        const newGroupId = groupMap[parseInt(gp.groupId)];
                        if (newGroupId && parseInt(gp.groupId) !== newGroupId) {
                            changed = true;
                            return { ...gp, groupId: newGroupId.toString() };
                        }
                        return gp;
                    });
                    
                    if (changed) {
                        await prisma.course.update({
                            where: { id: course.id },
                            data: { groupPrices: JSON.stringify(parsed) }
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse groupPrices for course", course.id);
                }
            }
        }
    }
    
    console.log("Fix completed successfully.");
}

fixClones().catch(console.error).finally(() => prisma.$disconnect());
