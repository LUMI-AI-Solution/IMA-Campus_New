const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tuteStock.create({
    data: {
      courseId: 317, 
      tuteName: "ACCOUNTING - BOOK 04 [ MAY BATCH ]",
      tuteImage: "TUTE_1785414914554_236874607.png",
      availableQuantity: 0
    }
  });
  
  await prisma.tuteStock.create({
    data: {
      courseId: 221, 
      tuteName: "ACCOUNTING - BOOK 02 [ JULY BATCH ]",
      tuteImage: "TUTE_1785414468520_807999688.jpg",
      availableQuantity: 0
    }
  });
  console.log("Created missing tutes");
}
main();
