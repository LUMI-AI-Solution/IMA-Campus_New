const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createStudent() {
  try {
    const hashedPassword = await bcrypt.hash('Sampath@123', 10);
    const existing = await prisma.user.findUnique({ where: { phone: '0777123456' } });
    if (existing) {
        console.log("Test student already exists!");
        return;
    }
    const user = await prisma.user.create({
      data: {
        firstName: 'Sampath',
        lastName: 'Tester',
        phone: '0777123456',
        password: hashedPassword,
        role: 'Student',
      }
    });

    console.log("Test student created successfully!");
  } catch (e) {
    console.error("Error creating student:", e);
  } finally {
    await prisma.$disconnect();
  }
}

createStudent();
