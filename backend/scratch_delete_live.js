const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteEndedLive() {
    try {
        console.log("Checking live classes to delete...");
        // 637 is the 2026.07.07 one (Ended)
        const idToDelete = 637;
        
        // Delete ContentCourse mappings first
        await prisma.contentCourse.deleteMany({
            where: { content_id: idToDelete }
        });
        console.log(`Deleted ContentCourse mappings for ID ${idToDelete}`);

        // Delete the content itself
        await prisma.content.delete({
            where: { id: idToDelete }
        });
        console.log(`Successfully deleted Content ID ${idToDelete} (Ended live class).`);

    } catch (e) {
        console.error("Error deleting live class:", e);
    }
}

deleteEndedLive().finally(() => prisma.$disconnect());
