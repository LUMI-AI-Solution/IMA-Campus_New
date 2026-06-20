const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('/root/IMA-Campus/imacampus_dump.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const paymentIds = [1066,1071,1125,1188,1193,1245,1273,1276,1292,1293,1309,1316,1350,1356,1360,1371,1385];
  console.log("Searching for Delivery rows in SQL backup for payments:", paymentIds);

  for await (const line of rl) {
    if (line.includes('INSERT INTO `Delivery`')) {
      const regex = /\(([^)]+)\)/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const values = match[1].split(',').map(s => s.trim().replace(/'/g, ''));
        const pid = parseInt(values[1]);
        if (paymentIds.includes(pid)) {
          console.log(`Found Deleted Delivery -> ID: ${values[0]}, PaymentID: ${pid}, StudentID: ${values[2]}, Tracking: ${values[5]}, Status: ${values[6]}`);
        }
      }
    }
  }
  console.log("Done searching.");
}

main().catch(console.error);
