const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const d = await prisma.delivery.findFirst({
        where: { status: 'Pending' },
        include: { items: true, payment: { include: { group: true } } }
    });
    if (!d) return console.log("No pending deliveries");

    const item = d.items[0];
    const course = await prisma.course.findUnique({where: {id: item.courseId}});

    let lecturerImage = 'default.png';
    let tuteCover = 'default-tute.png';
    
    if (course && course.groupPrices) {
        const gpArr = JSON.parse(course.groupPrices);
        console.log("gpArr:", gpArr);
        
        let matchedGp;
        if (d.payment?.groupId) {
            matchedGp = gpArr.find(g => parseInt(g.groupId) === parseInt(d.payment.groupId));
        }
        console.log("matchedGp by groupId:", matchedGp);
        
        if (!matchedGp) matchedGp = gpArr.find(g => g.tuteName === item.tuteName) || gpArr[0];
        
        console.log("final matchedGp:", matchedGp);

        if (matchedGp) {
            if (matchedGp.lecturerImage) lecturerImage = matchedGp.lecturerImage;
            if (matchedGp.tuteCover) tuteCover = matchedGp.tuteCover;
        }
    }
    
    console.log("Final images:", {lecturerImage, tuteCover});
}
main();
