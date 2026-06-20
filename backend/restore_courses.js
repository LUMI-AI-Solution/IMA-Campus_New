const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const dump = fs.readFileSync('/root/IMA-Campus/imacampus_dump.sql', 'utf8');
    
    // Find the INSERT INTO `Course` statement
    const insertMatch = dump.match(/INSERT INTO `Course` VALUES (.*?);/s);
    if (!insertMatch) {
        console.error("Could not find Course inserts!");
        return;
    }
    
    const valuesString = insertMatch[1];
    
    // Split the values string into individual tuples.
    // Since groupPrices is a JSON string, it contains commas and quotes. 
    // It's safer to use a regex to match each tuple `(id, ...)`
    const tupleRegex = /\((\d+),(.*?)\)(?=(,\()|($))/g;
    let match;
    let updates = 0;
    
    while ((match = tupleRegex.exec(valuesString)) !== null) {
        const id = parseInt(match[1]);
        const rest = match[2];
        
        // We need the last 3 values from `rest`: activeMonths, 'startMonth', 'endMonth'
        // Let's just do a naive split by comma, BUT ignoring commas inside quotes!
        // A robust way: match all values separated by comma
        const valRegex = /'[^']*'|NULL|\d+|\d+\.\d+|true|false/g;
        const vals = rest.match(valRegex);
        
        if (vals && vals.length >= 3) {
            // The last three values are activeMonths, startMonth, endMonth
            let activeMonths = vals[vals.length - 3];
            let startMonth = vals[vals.length - 2];
            let endMonth = vals[vals.length - 1];
            
            // Clean up the quotes
            startMonth = startMonth.replace(/^'|'$/g, '');
            endMonth = endMonth.replace(/^'|'$/g, '');
            
            if (startMonth === 'NULL') startMonth = null;
            if (endMonth === 'NULL') endMonth = null;
            if (activeMonths === 'NULL') activeMonths = null;
            else activeMonths = parseInt(activeMonths);
            
            // Update the live DB
            try {
                await prisma.course.update({
                    where: { id: id },
                    data: {
                        startMonth: startMonth,
                        endMonth: endMonth,
                        activeMonths: activeMonths
                    }
                });
                updates++;
            } catch (e) {
                // If course was deleted since the dump, ignore
                if (e.code !== 'P2025') {
                    console.error(`Failed to update course ${id}:`, e.message);
                }
            }
        }
    }
    
    console.log(`Restored startMonth and endMonth for ${updates} courses from backup!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
