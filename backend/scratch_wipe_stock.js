const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting TuteStock Cleanup...");
  
  // 1. Fetch current stock
  const allStock = await prisma.tuteStock.findMany({
    include: { course: true }
  });
  console.log(`Found ${allStock.length} items in TuteStock.`);

  // 2. Backup to JSON
  const backupPath = path.join(__dirname, 'tute_stock_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(allStock, null, 2));
  console.log(`Backup saved to ${backupPath}`);

  // 3. Wipe TuteStock and TuteStockHistory
  const deletedStock = await prisma.tuteStock.deleteMany({});
  const deletedHistory = await prisma.tuteStockHistory.deleteMany({});
  console.log(`Deleted ${deletedStock.count} TuteStock records.`);
  console.log(`Deleted ${deletedHistory.count} TuteStockHistory records.`);

  // 4. Verify Deliveries and DeliveryItems
  const deliveryCount = await prisma.delivery.count();
  const deliveryItemCount = await prisma.deliveryItem.count();
  const remainingStock = await prisma.tuteStock.count();

  console.log(`Verification Results:`);
  console.log(`- Remaining TuteStock Count: ${remainingStock}`);
  console.log(`- Intact Delivery Count: ${deliveryCount}`);
  console.log(`- Intact DeliveryItem Count: ${deliveryItemCount}`);
}

main()
  .then(() => console.log("SUCCESS: TuteStock wiped successfully without affecting deliveries!"))
  .catch(err => console.error("ERROR during wipe:", err))
  .finally(() => prisma.$disconnect());
