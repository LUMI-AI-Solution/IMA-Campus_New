const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDeliveries() {
    // 1. Fix Student 1679 (Delivery 2594)
    // Add Course 264 (ET B1 new)
    const etItem = await prisma.deliveryItem.create({
        data: {
            deliveryId: 2594,
            courseId: 264,
            tuteName: "ET B1 new",
            quantity: 1
        }
    });
    console.log("Added ET tute for 1679:", etItem);

    // 2. Fix Student 1776 (Delivery 2183)
    // Add Course 330 (Book 01 [ July Batch])
    const engItem = await prisma.deliveryItem.create({
        data: {
            deliveryId: 2183,
            courseId: 330,
            tuteName: "Book 01 [ July Batch]",
            quantity: 1
        }
    });
    console.log("Added English tute for 1776:", engItem);
}

fixDeliveries().catch(console.error).finally(() => prisma.$disconnect());
