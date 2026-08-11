const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.lead.updateMany({
      where: { id: 1 },
      data: { assignedTo: parseInt("") }
    });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
