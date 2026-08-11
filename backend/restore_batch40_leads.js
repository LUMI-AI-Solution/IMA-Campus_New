const fs = require('fs');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching leads that were incorrectly assigned to Batch 40...");
    const batch40 = await prisma.batch.findUnique({ where: { id: 40 } });
    
    const leadsToRestore = await prisma.lead.findMany({
        where: {
            batchId: 40,
            createdAt: { lt: batch40.createdAt }
        },
        select: { id: true, batchId: true, phone: true }
    });
    
    console.log(`Found ${leadsToRestore.length} leads to restore.`);
    
    const leadIdsSet = new Set(leadsToRestore.map(l => l.id));
    const originalBatchMap = new Map();

    console.log("Scanning SQL dump for original batchIds... (This might take a minute)");

    const fileStream = fs.createReadStream('/root/imacampus_dump.sql');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `Lead`')) {
            // Match all tuples: (123, 'name', ...), (124, 'name', ...)
            const tuples = line.match(/\(\d+,.*?(?=\),\()|\(\d+,.*?(?=\);)/g);
            if (tuples) {
                for (let tuple of tuples) {
                    tuple = tuple + ')'; // re-add closing parenthesis for parsing
                    const idMatch = tuple.match(/^\((\d+),/);
                    if (idMatch) {
                        const id = parseInt(idMatch[1], 10);
                        if (leadIdsSet.has(id)) {
                            // Extract values. This simple split works well enough for ints/nulls which is what we need
                            let inString = false;
                            let values = [];
                            let currentVal = "";
                            for (let i = 1; i < tuple.length - 1; i++) {
                                const char = tuple[i];
                                if (char === "'" && tuple[i-1] !== "\\") {
                                    inString = !inString;
                                    currentVal += char;
                                } else if (char === "," && !inString) {
                                    values.push(currentVal);
                                    currentVal = "";
                                } else {
                                    currentVal += char;
                                }
                            }
                            values.push(currentVal);

                            const batchIdStr = values[24]; // 25th item (index 24)
                            let originalBatchId = null;
                            if (batchIdStr !== 'NULL') {
                                originalBatchId = parseInt(batchIdStr, 10);
                            }
                            
                            originalBatchMap.set(id, originalBatchId);
                            leadIdsSet.delete(id);
                            
                            if (leadIdsSet.size === 0) break;
                        }
                    }
                }
            }
        }
        if (leadIdsSet.size === 0) break;
    }

    console.log(`Extracted original batchIds for ${originalBatchMap.size} leads.`);
    if (leadIdsSet.size > 0) {
        console.log(`Could not find batchId for ${leadIdsSet.size} leads.`);
    }

    // Now update them
    console.log("Restoring original batchIds to the database...");
    let updatedCount = 0;
    for (const [id, originalBatchId] of originalBatchMap.entries()) {
        await prisma.lead.update({
            where: { id },
            data: { batchId: originalBatchId }
        });
        updatedCount++;
    }

    console.log(`Successfully restored ${updatedCount} leads to their exact original batches!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
