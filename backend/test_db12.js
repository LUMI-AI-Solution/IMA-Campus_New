const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const course = await prisma.course.findUnique({
        where: { id: 813 }
    });
    console.log("Original course:", course.name);
    
    const similarCourses = await prisma.course.findMany({
        where: { code: '31' }
    });
    
    let filtered = similarCourses.filter(c => {
        if (c.name === course.name) return true;
        if (course.code && c.code === course.code) {
            const reqFirstWord = course.name.trim().split(/[\s-]+/)[0].toLowerCase();
            const cFirstWord = c.name.trim().split(/[\s-]+/)[0].toLowerCase();
            return reqFirstWord === cFirstWord;
        }
        return false;
    });
    
    console.log("Filtered similar courses:");
    filtered.forEach(c => console.log(c.id, c.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
