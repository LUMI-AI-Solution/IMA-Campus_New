const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.tuteStock.findMany({
    orderBy: { id: 'asc' }
  });

  const map = {};
  let duplicateCount = 0;

  for (const stock of stocks) {
    // normalize name: lowercase and remove all extra spaces
    const normalizedName = stock.tuteName.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = `${stock.courseId}_${normalizedName}`;
    
    if (!map[key]) {
      map[key] = [stock];
    } else {
      map[key].push(stock);
      duplicateCount++;
    }
  }

  console.log(`Total TuteStock records: ${stocks.length}`);
  console.log(`Total normalized duplicates: ${duplicateCount}`);

  for (const key in map) {
    if (map[key].length > 1) {
      console.log(`\nCourseID_NormalizedTuteName: ${key}`);
      for (const s of map[key]) {
        console.log(` - ID: ${s.id}, Name: "${s.tuteName}", Qty: ${s.availableQuantity}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
