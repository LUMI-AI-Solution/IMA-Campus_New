const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// BigInt serialization fix
BigInt.prototype.toJSON = function() { return this.toString() }

async function main() {
    const contents = await prisma.content.findMany({
        orderBy: { id: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(contents, null, 2));

    const contentCourses = await prisma.contentCourse.findMany({
        where: { content_id: { in: contents.map(c => c.id) } }
    });
    console.log("Content Courses:", JSON.stringify(contentCourses, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
