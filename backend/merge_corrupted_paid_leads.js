const { PrismaClient } = require('/root/IMA-Campus/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

const isLive = process.argv.includes('--live');
const isDryRun = !isLive || process.argv.includes('--dry-run');

function getRealCore(phone) {
    if (!phone) return null;
    const digits = phone.split('_')[0].replace(/[^0-9]/g, '');
    let s = digits;
    if (s.startsWith('94')) s = s.slice(2);
    else if (s.startsWith('0')) s = s.slice(1);
    if (s.startsWith('7') && s.length >= 9) {
        return s.slice(0, 9);
    }
    return s.slice(-9);
}

function getBizId(phone) {
    if (!phone) return null;
    const m = phone.match(/_BIZ_(\d+)/);
    return m ? parseInt(m[1]) : null;
}

function hasExtraDigits(phone) {
    if (!phone) return false;
    const base = phone.split('_')[0].replace(/[^0-9]/g, '');
    if (base.startsWith('94') && base.length > 11) return true;
    if (base.startsWith('0') && base.length > 10) return true;
    return false;
}

async function runMerge() {
    console.log(`\n======================================================`);
    console.log(`🚀 RUNNING MERGE & CLEANUP (${isDryRun ? 'DRY RUN MODE (No DB Changes)' : 'LIVE MODE (Applying DB Changes)'})`);
    console.log(`======================================================\n`);

    try {
        console.log("Fetching leads from database...");
        const allLeads = await prisma.lead.findMany({
            select: {
                id: true,
                phone: true,
                name: true,
                campaignType: true,
                inquiryType: true,
                status: true,
                assignedTo: true,
                enrollmentStatus: true,
                unreadCount: true,
                lastMessage: true,
                lastMessageAt: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { messages: true } }
            }
        });

        console.log(`Loaded ${allLeads.length} total leads.\n`);

        // Index leads by Business and Real Core Phone
        // Key: `${bizId}_${corePhone}`
        const map = new Map();

        allLeads.forEach(lead => {
            if (!lead.phone) return;
            const core = getRealCore(lead.phone);
            const biz = getBizId(lead.phone);
            if (!core || !biz) return;
            const key = `${biz}_${core}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(lead);
        });

        let totalDuplicatesFound = 0;
        let totalMessagesToMove = 0;
        let totalLeadsToDelete = 0;
        let totalOrphansToRepair = 0;
        const proofActions = [];

        for (const [key, group] of map.entries()) {
            if (group.length <= 1) {
                // If single lead in group but has extra digits, we can repair it
                const single = group[0];
                if (hasExtraDigits(single.phone)) {
                    totalOrphansToRepair++;
                    const core = getRealCore(single.phone);
                    const suffix = single.phone.includes('_') ? '_' + single.phone.split('_').slice(1).join('_') : '';
                    const repairedPhone = `94${core}${suffix}`;
                    if (proofActions.length < 15) {
                        proofActions.push({
                            Action: 'REPAIR_PHONE',
                            LeadId: single.id,
                            CurrentPhone: single.phone,
                            Target: repairedPhone,
                            Messages: single._count.messages
                        });
                    }
                    if (!isDryRun) {
                        const existingTarget = await prisma.lead.findUnique({ where: { phone: repairedPhone } });
                        if (existingTarget && existingTarget.id !== single.id) {
                            if (single._count.messages > 0) {
                                await prisma.chatMessage.updateMany({
                                    where: { leadId: single.id },
                                    data: { leadId: existingTarget.id }
                                });
                            }
                            await prisma.leadRoundProgress.deleteMany({ where: { leadId: single.id } }).catch(() => {});
                            await prisma.lead.delete({ where: { id: single.id } });
                        } else {
                            await prisma.lead.update({
                                where: { id: single.id },
                                data: { phone: repairedPhone }
                            }).catch(e => console.error(`Error repairing lead ${single.id}:`, e.message));
                        }
                    }
                }
                continue;
            }

            // Check if group contains corrupted or duplicate _PAID leads
            const corruptedOrPaid = group.filter(l => hasExtraDigits(l.phone) || l.phone.includes('_PAID'));
            if (corruptedOrPaid.length === 0) continue;

            // Pick the best legitimate PRIMARY lead:
            // 1. Valid phone length (<= 11)
            // 2. Does NOT have _PAID suffix
            // 3. Assigned first
            // 4. ENROLLED first
            // 5. Most messages
            // 6. Most recently updated
            const legitimateCandidates = group.filter(l => !hasExtraDigits(l.phone) && !l.phone.includes('_PAID'));
            
            let primary = null;
            if (legitimateCandidates.length > 0) {
                legitimateCandidates.sort((a, b) => {
                    const aAssigned = a.assignedTo ? 1 : 0;
                    const bAssigned = b.assignedTo ? 1 : 0;
                    if (aAssigned !== bAssigned) return bAssigned - aAssigned;

                    const aEnrolled = a.enrollmentStatus === 'ENROLLED' ? 1 : 0;
                    const bEnrolled = b.enrollmentStatus === 'ENROLLED' ? 1 : 0;
                    if (aEnrolled !== bEnrolled) return bEnrolled - aEnrolled;

                    if (a._count.messages !== b._count.messages) return b._count.messages - a._count.messages;
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
                primary = legitimateCandidates[0];
            } else {
                // If all in group have extra digits or _PAID, pick the one with most messages/assigned as primary
                const sortedGroup = [...group].sort((a, b) => {
                    if (a.assignedTo && !b.assignedTo) return -1;
                    if (!a.assignedTo && b.assignedTo) return 1;
                    if (a._count.messages !== b._count.messages) return b._count.messages - a._count.messages;
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
                primary = sortedGroup[0];
            }

            const duplicates = group.filter(l => l.id !== primary.id);

            for (const dup of duplicates) {
                totalDuplicatesFound++;
                const msgsCount = dup._count.messages;
                if (msgsCount > 0) {
                    totalMessagesToMove += msgsCount;
                }
                totalLeadsToDelete++;

                if (proofActions.length < 15) {
                    proofActions.push({
                        Action: msgsCount > 0 ? 'MOVE_MSGS_AND_DELETE' : 'DELETE_DUPLICATE',
                        LeadId: dup.id,
                        CurrentPhone: dup.phone,
                        Target: `Primary Lead ID: ${primary.id} (${primary.phone})`,
                        Messages: msgsCount
                    });
                }

                if (!isDryRun) {
                    // 1. Move chat messages if any
                    if (msgsCount > 0) {
                        await prisma.chatMessage.updateMany({
                            where: { leadId: dup.id },
                            data: { leadId: primary.id }
                        });
                    }

                    // 2. Sync unread count and latest message if newer
                    let updatePrimary = {};
                    if ((dup.unreadCount || 0) > (primary.unreadCount || 0)) {
                        updatePrimary.unreadCount = dup.unreadCount;
                    }
                    if (dup.lastMessageAt && (!primary.lastMessageAt || new Date(dup.lastMessageAt) > new Date(primary.lastMessageAt))) {
                        updatePrimary.lastMessage = dup.lastMessage;
                        updatePrimary.lastMessageAt = dup.lastMessageAt;
                    }
                    if (Object.keys(updatePrimary).length > 0) {
                        await prisma.lead.update({
                            where: { id: primary.id },
                            data: updatePrimary
                        });
                    }

                    // 3. Delete LeadRoundProgress on duplicate
                    await prisma.leadRoundProgress.deleteMany({
                        where: { leadId: dup.id }
                    }).catch(() => {});

                    // 4. Delete the duplicate lead
                    await prisma.lead.delete({
                        where: { id: dup.id }
                    });
                }
            }
        }

        console.log(`======================================================`);
        console.log(`📋 MERGE SUMMARY REPORT`);
        console.log(`======================================================`);
        console.log(`- Total Duplicate Leads to Remove : ${totalLeadsToDelete}`);
        console.log(`- Total Chat Messages to Transfer  : ${totalMessagesToMove}`);
        console.log(`- Total Orphaned Leads to Repair   : ${totalOrphansToRepair}`);
        console.log(`- Mode                             : ${isDryRun ? 'DRY RUN (No data was touched)' : 'LIVE (All changes applied!)'}`);
        console.log(`======================================================\n`);

        console.log(`Sample Actions Preview (First 15 items):`);
        console.table(proofActions);

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runMerge();
