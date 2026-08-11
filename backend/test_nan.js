const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const rawPayments = await prisma.payment.findMany({
        where: { id: 2208 },
        include: { student: true, business: true, batch: true, group: true }
    });
    const allCourses = await prisma.course.findMany({ select: { id: true, name: true, price: true, code: true, isDiscountExcluded: true } });
    const courseMap = {};
    allCourses.forEach(c => courseMap[c.id] = c);

    const p = rawPayments[0];
    let systemTotal = 0; let parsedSubjects = [];
    const subIds = JSON.parse(p.subjects).map(id => parseInt(id));

    let activeGroupDiscount = null;
    if (p.group && p.group.discount_rules) {
        const rules = JSON.parse(p.group.discount_rules);
        activeGroupDiscount = rules[0];
    }

    parsedSubjects = subIds.map(id => {
        const course = courseMap[id];
        let price = course ? parseFloat(course.price || 0) : 0;
        
        if (activeGroupDiscount && activeGroupDiscount.newPricePerCourse !== undefined && activeGroupDiscount.newPricePerCourse !== null && course && !course.isDiscountExcluded) {
            price = parseFloat(activeGroupDiscount.newPricePerCourse);
        }
        
        if (course) {
            systemTotal += price;
            return { ...course, price };
        }
        return { id, name: 'Unknown Course', price, code: 'N/A' };
    });
    
    console.log(parsedSubjects);
    console.log("systemTotal:", systemTotal);
}
check();
