const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/coordinator-crm/master-todo-stats
exports.getMasterTodoStats = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id || req.query.loggedUserId);
        const userRole = (req.user?.role || '').toUpperCase().replace(/ /g, '_');
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER', 'ADMIN'].includes(userRole);

        let userWhere = { role: { in: ['coordinator', 'manager', 'admin', 'Coordinator', 'Caller', 'COORDINATOR'] } };
        
        // If not manager, only fetch the logged-in user's stats
        if (!isManager && userId) {
            userWhere.id = userId;
        }

        const coordinators = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, firstName: true, lastName: true }
        });

        // Initialize maps
        const statsMap = {};
        coordinators.forEach(c => {
            statsMap[c.id] = {
                id: c.id,
                name: `${c.firstName} ${c.lastName || ''}`.trim(),
                freeSemPending: 0,
                openSemPending: 0,
                newInqR1Pending: 0,
                newInqR2Pending: 0,
                newInqR1NoAnswer: 0,
                newInqR2NoAnswer: 0,
                unreadChats: 0
            };
        });

        // 1. FREE SEMINAR (FREE_SEMINAR campaignType)
        const freeSemLeads = await prisma.lead.findMany({
            where: { campaignType: 'FREE_SEMINAR', callStatus: 'pending', assignedTo: { not: null } },
            select: { assignedTo: true }
        });
        freeSemLeads.forEach(l => {
            if (statsMap[l.assignedTo]) statsMap[l.assignedTo].freeSemPending++;
        });

        // 2. OPEN SEMINAR (AFTER_SEMINAR, inquiryType: OPEN_SEMINAR)
        const openSemLeads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR', callStatus: 'pending', assignedTo: { not: null } },
            select: { assignedTo: true }
        });
        openSemLeads.forEach(l => {
            if (statsMap[l.assignedTo]) statsMap[l.assignedTo].openSemPending++;
        });

        // 3. NEW INQUIRY (AFTER_SEMINAR, inquiryType: NEW_INQ)
        // Need to check RoundProgress
        const newInqLeads = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ', assignedTo: { not: null } },
            select: { 
                assignedTo: true, 
                callStatus: true,
                coordinationRound: true,
                roundProgress: {
                    select: { roundNum: true, callStatus: true }
                }
            }
        });

        newInqLeads.forEach(l => {
            if (!statsMap[l.assignedTo]) return;

            // Round 1
            const r1 = l.roundProgress?.find(r => r.roundNum === 1);
            if (r1) {
                if (r1.callStatus === 'pending') statsMap[l.assignedTo].newInqR1Pending++;
                if (r1.callStatus === 'no_answer') statsMap[l.assignedTo].newInqR1NoAnswer++;
            } else {
                if (l.coordinationRound === 1) {
                    if (l.callStatus === 'pending') statsMap[l.assignedTo].newInqR1Pending++;
                    if (l.callStatus === 'no_answer') statsMap[l.assignedTo].newInqR1NoAnswer++;
                }
            }

            // Round 2
            const r2 = l.roundProgress?.find(r => r.roundNum === 2);
            if (r2) {
                if (r2.callStatus === 'pending') statsMap[l.assignedTo].newInqR2Pending++;
                if (r2.callStatus === 'no_answer') statsMap[l.assignedTo].newInqR2NoAnswer++;
            } else {
                if (l.coordinationRound === 2) {
                    if (l.callStatus === 'pending') statsMap[l.assignedTo].newInqR2Pending++;
                    if (l.callStatus === 'no_answer') statsMap[l.assignedTo].newInqR2NoAnswer++;
                }
            }
        });

        // 4. UNREAD CHATS
        // Unread chats for leads assigned to coordinator
        const unreadMessages = await prisma.chatMessage.findMany({
            where: { 
                isRead: false, 
                direction: { in: ['inbound', 'in', 'IN'] }, 
                lead: { assignedTo: { not: null } }
            },
            select: { lead: { select: { assignedTo: true, id: true } } }
        });

        // We want unread "Chats" (meaning unique leads with unread messages)
        const unreadChatMap = {};
        unreadMessages.forEach(m => {
            if (!m.lead || !m.lead.assignedTo) return;
            const staffId = m.lead.assignedTo;
            const leadId = m.lead.id;
            if (!unreadChatMap[staffId]) unreadChatMap[staffId] = new Set();
            unreadChatMap[staffId].add(leadId);
        });

        Object.keys(unreadChatMap).forEach(staffId => {
            if (statsMap[staffId]) {
                statsMap[staffId].unreadChats = unreadChatMap[staffId].size;
            }
        });

        // Filter out coordinators with 0 across the board unless requested specifically
        let results = Object.values(statsMap).filter(c => 
            c.freeSemPending > 0 || 
            c.openSemPending > 0 || 
            c.newInqR1Pending > 0 || 
            c.newInqR2Pending > 0 ||
            c.newInqR1NoAnswer > 0 ||
            c.newInqR2NoAnswer > 0 ||
            c.unreadChats > 0
        );

        res.status(200).json(results);

    } catch (error) {
        console.error("Master Todo Stats Error:", error);
        res.status(500).json({ error: "Failed to load master todo stats" });
    }
};
