const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Create a Business
    const business = await prisma.business.create({
      data: {
        name: "IMA Campus",
        category: "Advance Level",
        medium: "Sinhala",
        description: "Leading Advanced Level Campus",
        logo: "logo.png",
        status: 1,
      }
    });
    console.log("✅ Created Business:", business.name);

    // 2. Create a Batch
    const batch = await prisma.batch.create({
      data: {
        name: "A/L 2026 Theory",
        type: 1,
        status: 1,
        businessId: business.id,
        description: "2026 Advanced Level Theory Batch"
      }
    });
    console.log("✅ Created Batch:", batch.name);

    // 3. Create a Group
    const group = await prisma.group.create({
      data: {
        name: "Main Group",
        type: 1,
        batchId: batch.id,
      }
    });
    console.log("✅ Created Group:", group.name);

    console.log("🎉 Sample test data seeded successfully!");
  } catch(e) {
    console.error("❌ Seed error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
