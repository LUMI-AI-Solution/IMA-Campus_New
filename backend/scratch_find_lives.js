const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLives() {
    const lives = await prisma.content.findMany({
        where: { title: { contains: 'IMA Online School 2027' } }
    });
    
    console.log(`Found ${lives.length} matching contents.`);
    
    for (const l of lives) {
        console.log(`\nID: ${l.id}, Title: ${l.title}`);
        console.log(`Type: ${l.contentType}, Status: ${l.status}, CategoryId: ${l.categoryId}`);
        console.log(`Date: ${l.date}, Start: ${l.startTime}, End: ${l.endTime}`);
        
        // Find mapped courses
        const maps = await prisma.contentCourse.findMany({
            where: { content_id: l.id }
        });
        
        if (maps.length > 0) {
            console.log(`Mapped to Course IDs: ${maps.map(m => m.course_id.toString()).join(', ')}`);
        } else {
            console.log('NOT MAPPED TO ANY COURSE!');
        }
    }
}

findLives().finally(() => prisma.$disconnect());
