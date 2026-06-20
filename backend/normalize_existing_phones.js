const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getNormalizedBase(phone) {
    if (!phone) return null;
    let [baseNumber, ...rest] = phone.split('_');
    let suffix = rest.length > 0 ? '_' + rest.join('_') : '';
    
    // Remove non-numeric characters from base
    let cleanBase = baseNumber.replace(/[^0-9]/g, '');
    
    if (cleanBase.startsWith('07')) {
        cleanBase = '94' + cleanBase.slice(1);
    } else if (cleanBase.length === 9 && cleanBase.startsWith('7')) {
        cleanBase = '94' + cleanBase;
    }
    
    return {
        original: phone,
        normalized: cleanBase + suffix,
        cleanBase: cleanBase
    };
}

async function normalizeLeads() {
    console.log("Fetching all leads...");
    const allLeads = await prisma.lead.findMany({
        select: { id: true, phone: true }
    });

    console.log(`Found ${allLeads.length} total leads. Analyzing for 07 formats...`);

    const leadMap = new Map();
    allLeads.forEach(l => {
        leadMap.set(l.phone, l.id);
    });

    const leadsToUpdate = [];
    const leadsToDelete = [];

    for (const lead of allLeads) {
        if (!lead.phone) continue;
        
        let [baseNumber] = lead.phone.split('_');
        if (baseNumber.startsWith('07')) {
            const { normalized } = getNormalizedBase(lead.phone);
            
            // If the normalized version already exists, this is a duplicate. We must delete it.
            if (leadMap.has(normalized)) {
                leadsToDelete.push(lead.id);
            } 
            // If the normalized version doesn't exist, we just update this record to the normalized format.
            else {
                leadsToUpdate.push({ id: lead.id, newPhone: normalized });
                // Add the new normalized phone to the map so we don't accidentally update another one to the same value
                leadMap.set(normalized, lead.id);
            }
        }
    }

    console.log(`Identified ${leadsToDelete.length} duplicates to DELETE.`);
    console.log(`Identified ${leadsToUpdate.length} valid 07 leads to UPDATE to 94 format.`);

    if (leadsToDelete.length > 0) {
        console.log("Deleting duplicates...");
        const delRes = await prisma.lead.deleteMany({
            where: { id: { in: leadsToDelete } }
        });
        console.log(`✅ Deleted ${delRes.count} duplicate leads.`);
    }

    if (leadsToUpdate.length > 0) {
        console.log("Updating leads to 94 format...");
        let updatedCount = 0;
        for (const update of leadsToUpdate) {
            try {
                await prisma.lead.update({
                    where: { id: update.id },
                    data: { phone: update.newPhone }
                });
                updatedCount++;
            } catch(e) {
                console.error(`Failed to update lead ${update.id} to ${update.newPhone}:`, e.message);
            }
        }
        console.log(`✅ Successfully updated ${updatedCount} leads to 94 format.`);
    }

    console.log("Normalization process complete!");
}

normalizeLeads()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
