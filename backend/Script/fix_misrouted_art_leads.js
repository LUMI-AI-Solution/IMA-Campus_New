const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== STARTING REMEDIATION FOR MISROUTED ART LEADS ===");

    // 1. Unblock any leads for 0714941559 where isBlocked is false but status is BLOCKED
    const unblockRes = await prisma.lead.updateMany({
        where: {
            phone: { contains: "4941559" },
            isBlocked: false,
            status: "BLOCKED"
        },
        data: {
            status: "OPEN"
        }
    });
    console.log(`[1] Unblocked ${unblockRes.count} leads for 4941559 whose status was stuck on BLOCKED.`);

    // 2. Fix Chamindu Dilshan (0714941559) Art After Seminar Lead
    const chaminduArtPhone = '94714941559_BIZ_1_AS';
    let chaminduArtLead = await prisma.lead.findUnique({
        where: { phone: chaminduArtPhone }
    });

    if (!chaminduArtLead) {
        chaminduArtLead = await prisma.lead.create({
            data: {
                name: 'Chamindu Dilshan',
                phone: chaminduArtPhone,
                source: 'whatsapp',
                campaignType: 'AFTER_SEMINAR',
                status: 'NEW',
                inquiryType: 'NEW_INQ',
                unreadCount: 1,
                lastMessage: 'Yes',
                lastMessageAt: new Date(),
                phase: 1,
                callStatus: 'pending',
                paymentIntention: 'NOT_DECIDED',
                enrollmentStatus: 'NON_ENROLLED',
                autoReplyStep: 1,
                sequenceCompleted: true
            }
        });
        console.log(`[2] Created new Art After Seminar lead for Chamindu: ID ${chaminduArtLead.id} (${chaminduArtPhone})`);
    } else {
        console.log(`[2] Chamindu Art After Seminar lead already exists: ID ${chaminduArtLead.id}`);
    }

    // Move the Art After Seminar messages (488346, 488347, 488349, 488350) to chaminduArtLead
    const chaminduMsgIds = [488346, 488347, 488349, 488350];
    const moveChaminduMsgs = await prisma.chatMessage.updateMany({
        where: {
            id: { in: chaminduMsgIds }
        },
        data: {
            leadId: chaminduArtLead.id
        }
    });
    console.log(`[2] Moved ${moveChaminduMsgs.count} Art messages to Chamindu Art Lead (${chaminduArtLead.id}).`);

    // Update lead's last message
    await prisma.lead.update({
        where: { id: chaminduArtLead.id },
        data: {
            lastMessage: 'Yes',
            lastMessageAt: new Date('2026-09-15T09:21:48.125Z'),
            unreadCount: 1,
            status: 'NEW'
        }
    });

    // 3. Fix Janudi Rathnayaka (0774336937) Art After Seminar Lead
    const janudiArtPhone = '94774336937_BIZ_1_AS';
    let janudiArtLead = await prisma.lead.findUnique({
        where: { phone: janudiArtPhone }
    });

    if (!janudiArtLead) {
        janudiArtLead = await prisma.lead.create({
            data: {
                name: 'Janudi Rathnayaka',
                phone: janudiArtPhone,
                source: 'whatsapp',
                campaignType: 'AFTER_SEMINAR',
                status: 'NEW',
                inquiryType: 'NEW_INQ',
                unreadCount: 1,
                lastMessage: 'General english community ekata join karanna puluwanda',
                lastMessageAt: new Date('2026-09-12T09:11:29.397Z'),
                phase: 1,
                callStatus: 'pending',
                paymentIntention: 'NOT_DECIDED',
                enrollmentStatus: 'NON_ENROLLED'
            }
        });
        console.log(`[3] Created new Art After Seminar lead for Janudi: ID ${janudiArtLead.id} (${janudiArtPhone})`);
    } else {
        console.log(`[3] Janudi Art After Seminar lead already exists: ID ${janudiArtLead.id}`);
    }

    // Messages for Art from Lead 82418
    const janudiMsgIds = [475862, 475863, 475871, 475875];
    const moveJanudiMsgs = await prisma.chatMessage.updateMany({
        where: {
            id: { in: janudiMsgIds }
        },
        data: {
            leadId: janudiArtLead.id
        }
    });
    console.log(`[3] Moved ${moveJanudiMsgs.count} Art messages to Janudi Art Lead (${janudiArtLead.id}).`);

    // Update Janudi lead's last message
    await prisma.lead.update({
        where: { id: janudiArtLead.id },
        data: {
            lastMessage: 'General english community ekata join karanna puluwanda',
            lastMessageAt: new Date('2026-09-12T09:11:29.397Z'),
            unreadCount: 1,
            status: 'NEW'
        }
    });

    console.log("=== REMEDIATION COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
