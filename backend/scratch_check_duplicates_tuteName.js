const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.tuteStock.findMany({
    include: {
      course: {
        include: {
          group: {
            include: {
              batch: {
                include: { business: true }
              }
            }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  // Group by Lecturer + PaymentGroup + Normalized TuteName
  const map = {};
  for (const stock of stocks) {
    const lecName = stock.course?.lecturerName || "Unknown";
    const groupType = stock.course?.group?.type === 1 ? 'Monthly' : stock.course?.group?.type === 2 ? 'Full Payment' : 'Unknown';
    const normalizedTuteName = stock.tuteName.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const key = `${lecName} | ${groupType} | ${normalizedTuteName}`;
    if (!map[key]) {
      map[key] = [stock];
    } else {
      map[key].push(stock);
    }
  }

  let dupCount = 0;
  for (const key in map) {
    if (map[key].length > 1) {
      dupCount++;
      console.log(`\nDuplicate Group: ${key}`);
      for (const s of map[key]) {
        console.log(` - Stock ID: ${s.id}, Course ID: ${s.courseId}, Name: "${s.tuteName}", Qty: ${s.availableQuantity}`);
      }
    }
  }
  
  console.log(`Total duplicate groups: ${dupCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
