const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeliveries() {
    console.log("Fetching pending deliveries...");
    const items = await prisma.deliveryItem.findMany({
        where: {
            delivery: { status: 'Pending' }
        },
        include: {
            course: {
                include: { tuteStocks: true }
            },
            delivery: {
                include: { 
                    payment: { 
                        include: { student: true } 
                    } 
                }
            }
        }
    });

    const wrongDeliveries = new Map();
    let wrongItemsCount = 0;

    for (const item of items) {
        if (!item.course) continue;
        
        // A delivery item is likely wrong if the course has no TuteStocks at all
        // OR if the item's tuteName doesn't match any TuteStock name for that course.
        let isWrong = false;
        
        if (item.course.tuteStocks.length === 0) {
            isWrong = true;
        } else {
            const hasMatchingStock = item.course.tuteStocks.some(ts => ts.tuteName === item.tuteName);
            if (!hasMatchingStock && (item.tuteName === item.course.name || item.tuteName === "Course Tute")) {
                isWrong = true;
            }
        }

        if (isWrong) {
            wrongItemsCount++;
            if (!wrongDeliveries.has(item.deliveryId)) {
                const student = item.delivery?.payment?.student;
                wrongDeliveries.set(item.deliveryId, {
                    deliveryId: item.deliveryId,
                    studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                    phone: student ? (student.phone || student.whatsapp) : 'Unknown',
                    paymentType: item.delivery?.paymentType,
                    wrongItems: []
                });
            }
            wrongDeliveries.get(item.deliveryId).wrongItems.push({
                courseName: item.course.name,
                tuteName: item.tuteName
            });
        }
    }

    const wrongList = Array.from(wrongDeliveries.values());
    console.log(`\nFound ${wrongList.length} deliveries containing ${wrongItemsCount} incorrect items.`);
    
    if (wrongList.length > 0) {
        // Output up to 15
        console.log("\nSample of wrong deliveries:");
        for (const d of wrongList.slice(0, 15)) {
            console.log(`\nDelivery ID: ${d.deliveryId} | Student: ${d.studentName} (${d.phone}) | Type: ${d.paymentType}`);
            d.wrongItems.forEach(i => console.log(`   - Course: ${i.courseName} | Item Name: ${i.tuteName}`));
        }
    }
}

checkDeliveries()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
