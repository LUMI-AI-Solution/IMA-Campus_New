const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting TuteStock Restore...");
  
  const backupPath = path.join(__dirname, 'tute_stock_backup.json');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`);
  }

  const rawData = fs.readFileSync(backupPath, 'utf8');
  const backupItems = JSON.parse(rawData);
  console.log(`Loaded ${backupItems.length} items from backup file.`);

  // Prepare items for insertion (exclude relation objects like 'course')
  const recordsToInsert = backupItems.map(item => ({
    id: item.id,
    courseId: item.courseId,
    tuteName: item.tuteName,
    tuteImage: item.tuteImage || null,
    tuteImage2: item.tuteImage2 || null,
    availableQuantity: item.availableQuantity || 0,
    itemOrder: item.itemOrder || 1,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt)
  }));

  // Clear any current items before restoring
  await prisma.tuteStock.deleteMany({});

  // Insert back using createMany
  const result = await prisma.tuteStock.createMany({
    data: recordsToInsert,
    skipDuplicates: true
  });

  console.log(`Successfully restored ${result.count} TuteStock records!`);

  const currentCount = await prisma.tuteStock.count();
  console.log(`Current TuteStock DB Count: ${currentCount}`);
}

main()
  .then(() => console.log("SUCCESS: TuteStock fully restored!"))
  .catch(err => console.error("ERROR during restore:", err))
  .finally(() => prisma.$disconnect());
