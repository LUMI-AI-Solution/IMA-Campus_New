const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * One-time cleanup script to merge duplicate leads for the same phone+business.
 * Duplicates happen when the same WhatsApp number has multiple lead records with
 * different suffixes like _BATCH_X, _AS, _PAID, etc.
 * 
 * This script:
 * 1. Finds all duplicate groups (same base phone + business ID)
 * 2. Picks the BEST lead (assigned > most chat messages > most recent)
 * 3. Moves all chat messages from duplicates to the primary lead
 * 4. Deletes duplicate leads
 */
async function mergeExistingDuplicates() {
    try {
        console.log('🔍 Finding all AFTER_SEMINAR leads...');
        const allLeads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR' },
            include: { _count: { select: { messages: true } } }
        });
        
        console.log(`Found ${allLeads.length} total leads.`);
        
        // Group by base phone + business ID
        const groups = {};
        for (const lead of allLeads) {
            if (!lead.phone || !lead.phone.includes('_BIZ_')) continue;
            const base = lead.phone.split('_BIZ')[0];
            const bizMatch = lead.phone.match(/_BIZ_(\d+)/);
            if (!bizMatch) continue;
            const biz = bizMatch[1];
            const key = `${base}|${biz}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(lead);
        }
        
        // Find duplicate groups
        const duplicateGroups = Object.entries(groups).filter(([, leads]) => leads.length > 1);
        
        if (duplicateGroups.length === 0) {
            console.log('✅ No duplicates found! Database is clean.');
            return;
        }
        
        console.log(`\n⚠️  Found ${duplicateGroups.length} phone numbers with duplicates.\n`);
        
        let totalMerged = 0;
        let totalDeleted = 0;
        
        for (const [key, leads] of duplicateGroups) {
            console.log(`\n--- Processing: ${key} (${leads.length} leads) ---`);
            
            // Sort: assigned first, then by chat message count, then by updatedAt
            const sorted = [...leads].sort((a, b) => {
                // Prefer assigned leads
                if (a.assignedTo && !b.assignedTo) return -1;
                if (!a.assignedTo && b.assignedTo) return 1;
                // Then prefer leads with more chat messages
                if (a._count.messages !== b._count.messages) return b._count.messages - a._count.messages;
                // Then prefer most recently updated
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
            
            const primary = sorted[0];
            const duplicates = sorted.slice(1);
            const duplicateIds = duplicates.map(l => l.id);
            
            console.log(`  PRIMARY: ID=${primary.id} | Phone=${primary.phone} | Assigned=${primary.assignedTo} | Msgs=${primary._count.messages}`);
            for (const dup of duplicates) {
                console.log(`  DUPLICATE: ID=${dup.id} | Phone=${dup.phone} | Assigned=${dup.assignedTo} | Msgs=${dup._count.messages}`);
            }
            
            // Move chat messages from duplicates to primary
            const moveResult = await prisma.chatMessage.updateMany({
                where: { leadId: { in: duplicateIds } },
                data: { leadId: primary.id }
            });
            console.log(`  ✅ Moved ${moveResult.count} chat messages to primary lead.`);
            
            // Delete LeadRoundProgress for duplicates (to avoid unique constraint issues)
            await prisma.leadRoundProgress.deleteMany({
                where: { leadId: { in: duplicateIds } }
            }).catch(() => {});
            
            // If primary has no unread but a duplicate did, keep the highest unread count
            const maxUnread = Math.max(primary.unreadCount || 0, ...duplicates.map(d => d.unreadCount || 0));
            if (maxUnread > (primary.unreadCount || 0)) {
                await prisma.lead.update({
                    where: { id: primary.id },
                    data: { unreadCount: maxUnread }
                });
            }
            
            // If a duplicate has a more recent lastMessage, copy it to primary
            const newestDup = [...duplicates].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))[0];
            if (newestDup && newestDup.lastMessageAt && (!primary.lastMessageAt || new Date(newestDup.lastMessageAt) > new Date(primary.lastMessageAt))) {
                await prisma.lead.update({
                    where: { id: primary.id },
                    data: { 
                        lastMessage: newestDup.lastMessage,
                        lastMessageAt: newestDup.lastMessageAt 
                    }
                });
            }
            
            // Delete duplicate leads
            const deleteResult = await prisma.lead.deleteMany({
                where: { id: { in: duplicateIds } }
            });
            console.log(`  🗑️  Deleted ${deleteResult.count} duplicate leads.`);
            
            totalMerged += moveResult.count;
            totalDeleted += deleteResult.count;
        }
        
        console.log(`\n\n========================================`);
        console.log(`✅ CLEANUP COMPLETE!`);
        console.log(`   - ${duplicateGroups.length} duplicate groups processed`);
        console.log(`   - ${totalMerged} chat messages moved`);
        console.log(`   - ${totalDeleted} duplicate leads deleted`);
        console.log(`========================================\n`);
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

mergeExistingDuplicates();
