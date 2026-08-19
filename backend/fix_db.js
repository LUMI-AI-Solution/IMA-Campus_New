const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const coursesToFix = [960, 1055];
    const newImage = "1786264578903_279737202.png";
    const newTuteName = "Aruni Miss - 06 Tutes";
    
    for (let id of coursesToFix) {
        const course = await prisma.course.findUnique({ where: { id } });
        if (course && course.groupPrices) {
            let prices = JSON.parse(course.groupPrices);
            prices = prices.map(p => ({
                ...p,
                tuteName: newTuteName,
                lecturerImage: newImage
            }));
            await prisma.course.update({
                where: { id },
                data: { groupPrices: JSON.stringify(prices) }
            });
            console.log(`Fixed course ${id}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
