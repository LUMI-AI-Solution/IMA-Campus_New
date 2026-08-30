const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Submit handover requests (Coordinators)
exports.requestTransfer = async (req, res) => {
    try {
        const { leadIds } = req.body;
        const coordinatorId = req.user?.id || req.user?.userId;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: "Invalid lead selection" });
        }

        await prisma.lead.updateMany({
            where: { id: { in: leadIds.map(id => parseInt(id)) } },
            data: {
                callCenterRequestStatus: 'REQUESTED',
                callCenterRequestedBy: parseInt(coordinatorId)
            }
        });

        res.status(200).json({ message: `Successfully requested call center transfer for ${leadIds.length} leads!` });
    } catch (error) {
        console.error("Call Center requestTransfer Error:", error);
        res.status(500).json({ error: "Failed to submit request" });
    }
};

// 2. Fetch pending handover requests (Managers/Admins)
exports.getPendingRequests = async (req, res) => {
    try {
        const { businessId } = req.query;

        const whereClause = {
            callCenterRequestStatus: 'REQUESTED'
        };

        if (businessId && businessId !== 'All') {
            whereClause.batch = {
                businessId: parseInt(businessId)
            };
        }

        const pendingLeads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                batch: { include: { business: true } },
                assignedUser: { select: { id: true, firstName: true, lastName: true, role: true, department: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.status(200).json(safeJson(pendingLeads));
    } catch (error) {
        console.error("Call Center getPendingRequests Error:", error);
        res.status(500).json({ error: "Failed to fetch pending requests" });
    }
};

// 3. Process coordinator lead handover requests (Managers/Admins)
exports.processTransferRequest = async (req, res) => {
    try {
        const { leadIds, action } = req.body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: "Invalid lead selection" });
        }

        const isApprove = action === 'APPROVE';

        await prisma.lead.updateMany({
            where: { id: { in: leadIds.map(id => parseInt(id)) } },
            data: {
                callCenterRequestStatus: isApprove ? 'APPROVED' : 'REJECTED',
                isCallCenter: isApprove ? true : false,
                callCenterStatus: isApprove ? 'pending' : 'pending',
                assignedTo: isApprove ? null : undefined // Clear assignee on approve so manager distributes
            }
        });

        res.status(200).json({ message: `Successfully ${isApprove ? 'approved' : 'rejected'} transfer for ${leadIds.length} leads!` });
    } catch (error) {
        console.error("Call Center processTransferRequest Error:", error);
        res.status(500).json({ error: "Failed to process requests" });
    }
};

// 4. Fetch Call Center leads (Manager overview and stream buckets)
exports.getManagerLeads = async (req, res) => {
    try {
        const { businessId, campaignType, tab } = req.query;

        const whereClause = {
            isCallCenter: true
        };

        if (campaignType && campaignType !== 'All') {
            if (campaignType === 'BRIDGE') {
                whereClause.source = 'bridge_transfer';
            } else if (campaignType === 'AFTER_SEMINAR') {
                whereClause.campaignType = 'AFTER_SEMINAR';
                whereClause.source = { not: 'bridge_transfer' };
            } else {
                whereClause.campaignType = campaignType;
            }
        }

        if (businessId && businessId !== 'All') {
            whereClause.batch = {
                businessId: parseInt(businessId)
            };
        }

        if (tab === 'unassigned') {
            whereClause.OR = [
                { assignedTo: null },
                { assignedUser: { department: { not: 'Call Center' } } }
            ];
        } else if (tab === 'assigned') {
            whereClause.assignedTo = { not: null };
            whereClause.assignedUser = { department: 'Call Center' };
        } else if (tab === 'completed') {
            whereClause.callCenterStatus = 'completed';
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                batch: { include: { business: true } },
                assignedUser: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
                roundProgress: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(safeJson(leads));
    } catch (error) {
        console.error("Call Center getManagerLeads Error:", error);
        res.status(500).json({ error: "Failed to fetch manager leads" });
    }
};

// 5. Fetch call center staff list (Managers/Admins)
exports.getCallCenterStaff = async (req, res) => {
    try {
        const staffList = await prisma.user.findMany({
            where: {
                department: 'Call Center',
                role: { notIn: ['Student', 'USER', 'STUDENT', 'Manager', 'MANAGER', 'SYSTEM_ADMIN', 'DIRECTOR', 'head_manager', 'ass_manager'] }
            },
            select: { id: true, firstName: true, lastName: true, phone: true, role: true, department: true, businessType: true },
            orderBy: { firstName: 'asc' }
        });

        // Compute dynamic counts per staff
        const staffWithProgress = await Promise.all(staffList.map(async (member) => {
            const totalAssigned = await prisma.lead.count({
                where: { isCallCenter: true, assignedTo: member.id }
            });
            const completed = await prisma.lead.count({
                where: { isCallCenter: true, assignedTo: member.id, callCenterStatus: 'completed' }
            });

            return {
                ...member,
                totalAssigned,
                completed,
                pending: totalAssigned - completed
            };
        }));

        res.status(200).json(safeJson(staffWithProgress));
    } catch (error) {
        console.error("Call Center getCallCenterStaff Error:", error);
        res.status(500).json({ error: "Failed to fetch staff members" });
    }
};

// 6. Bulk assign leads to Call Center Agents (Managers/Admins)
exports.assignLeadsToAgent = async (req, res) => {
    try {
        const { leadIds, agentId } = req.body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: "No leads selected" });
        }

        const targetAgentId = agentId ? parseInt(agentId) : null;

        await prisma.lead.updateMany({
            where: { id: { in: leadIds.map(id => parseInt(id)) } },
            data: {
                assignedTo: targetAgentId,
                isCallCenter: true,
                callCenterStatus: 'pending' // Reset status for agent to call
            }
        });

        res.status(200).json({ message: `Successfully assigned ${leadIds.length} leads to staff member!` });
    } catch (error) {
        console.error("Call Center assignLeadsToAgent Error:", error);
        res.status(500).json({ error: "Failed to assign leads" });
    }
};

// 7. Get Agent's assigned calling campaigns leads (Staff)
exports.getAgentLeads = async (req, res) => {
    try {
        const agentId = req.user?.id || req.user?.userId;
        const { campaignType, statusFilter } = req.query;

        if (!agentId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const whereClause = {
            isCallCenter: true,
            assignedTo: parseInt(agentId)
        };

        if (campaignType && campaignType !== 'All') {
            whereClause.campaignType = campaignType;
        }

        if (statusFilter === 'pending') {
            whereClause.callCenterStatus = 'pending';
        } else if (statusFilter === 'completed') {
            whereClause.callCenterStatus = 'completed';
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                batch: { include: { business: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.status(200).json(safeJson(leads));
    } catch (error) {
        console.error("Call Center getAgentLeads Error:", error);
        res.status(500).json({ error: "Failed to load agent leads" });
    }
};

// 8. Update lead calling details & logattempts (Staff)
exports.updateLeadCallingStatus = async (req, res) => {
    try {
        const { leadId, callStatus, callMethod, feedback, phase, callAttemptIncrement } = req.body;
        const agentId = req.user?.id || req.user?.userId;

        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(leadId) }
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });
        if (lead.assignedTo !== parseInt(agentId)) {
            return res.status(403).json({ error: "Access denied. Lead not assigned to you." });
        }

        const updateData = {};
        if (callStatus) {
            updateData.callStatus = callStatus;
            
            // Mark completed in Call Center when callStatus changes to completed/answered outcomes
            if (['no_answer', 'busy', 'completed', 'enrolled', 'not_interested', 'interested'].includes(callStatus.toLowerCase())) {
                updateData.callCenterStatus = 'completed';
            }
        }
        if (callMethod) updateData.callMethod = callMethod;
        if (feedback) updateData.feedback = feedback;
        if (phase) updateData.phase = parseInt(phase);

        if (callAttemptIncrement) {
            updateData.callAttempt = { increment: 1 };
        }

        const updatedLead = await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: updateData
        });

        res.status(200).json(safeJson(updatedLead));
    } catch (error) {
        console.error("Call Center updateLeadCallingStatus Error:", error);
        res.status(500).json({ error: "Failed to update lead data" });
    }
};

// 9. Fetch summary stats (Manager & Staff Overview)
exports.getCallCenterStats = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const role = req.user?.role?.toUpperCase();
        const { businessId } = req.query;

        const bizFilter = {};
        if (businessId && businessId !== 'All') {
            bizFilter.batch = { businessId: parseInt(businessId) };
        }

        // Manager / Admin stats
        const isManager = role === 'MANAGER' || role === 'SUPER' || role === 'SYSTEM_ADMIN' || role === 'DIRECTOR';

        if (isManager) {
            const totalRequested = await prisma.lead.count({ where: { callCenterRequestStatus: 'REQUESTED', ...bizFilter } });
            const totalUnassigned = await prisma.lead.count({ where: { isCallCenter: true, assignedTo: null, ...bizFilter } });
            const totalAssigned = await prisma.lead.count({ where: { isCallCenter: true, assignedTo: { not: null }, ...bizFilter } });
            const totalCompleted = await prisma.lead.count({ where: { isCallCenter: true, callCenterStatus: 'completed', ...bizFilter } });
            
            const totalLeads = totalUnassigned + totalAssigned;

            return res.status(200).json({
                totalRequested,
                totalUnassigned,
                totalAssigned,
                totalCompleted,
                totalLeads,
                pendingLeads: totalLeads - totalCompleted
            });
        }

        // Agent-specific performance stats
        const totalAssigned = await prisma.lead.count({ where: { isCallCenter: true, assignedTo: parseInt(userId) } });
        const totalCompleted = await prisma.lead.count({ where: { isCallCenter: true, assignedTo: parseInt(userId), callCenterStatus: 'completed' } });
        const totalAttempts = await prisma.lead.aggregate({
            where: { isCallCenter: true, assignedTo: parseInt(userId) },
            _sum: { callAttempt: true }
        });

        const weeklyStats = [
            { day: 'Mon', completed: Math.round(totalCompleted * 0.15) },
            { day: 'Tue', completed: Math.round(totalCompleted * 0.20) },
            { day: 'Wed', completed: Math.round(totalCompleted * 0.15) },
            { day: 'Thu', completed: Math.round(totalCompleted * 0.25) },
            { day: 'Fri', completed: Math.round(totalCompleted * 0.15) },
            { day: 'Sat', completed: Math.round(totalCompleted * 0.10) }
        ];

        res.status(200).json({
            totalAssigned,
            totalCompleted,
            pendingCalls: totalAssigned - totalCompleted,
            totalAttempts: totalAttempts._sum?.callAttempt || 0,
            weeklyStats
        });

    } catch (error) {
        console.error("Call Center getCallCenterStats Error:", error);
        res.status(500).json({ error: "Failed to calculate statistics" });
    }
};

// 10. Start Next Round (Manager)
exports.startRound = async (req, res) => {
    try {
        const { businessId, campaignType, batchId } = req.body;
        
        let whereClause = {
            isCallCenter: true,
            batch: { businessId: parseInt(businessId) }
        };

        if (campaignType === 'BRIDGE') {
            whereClause.source = 'bridge_transfer';
        } else if (campaignType === 'AFTER_SEMINAR') {
            whereClause.campaignType = 'AFTER_SEMINAR';
            whereClause.source = { not: 'bridge_transfer' };
        } else if (campaignType && campaignType !== 'All') {
            whereClause.campaignType = campaignType;
        }

        if (batchId && batchId !== 'All') {
            whereClause.batchId = parseInt(batchId);
        }

        // Find all assigned leads for this business & campaign (and batch if provided)
        const leads = await prisma.lead.findMany({
            where: whereClause
        });

        // Instead of modifying the base Lead (which is Round 1), we create LeadRoundProgress for Round 2
        const updatePromises = leads.map(lead => {
            return prisma.leadRoundProgress.upsert({
                where: {
                    leadId_roundNum: { leadId: lead.id, roundNum: 2 }
                },
                update: {
                    // Reset to pending if it was already created but we are "re-starting"
                    phase: 1,
                    callStatus: 'pending',
                    callAttempt: 0,
                    feedback: lead.feedback // Keep feedback from Round 1
                },
                create: {
                    leadId: lead.id,
                    roundNum: 2,
                    phase: 1,
                    callStatus: 'pending',
                    callAttempt: 0,
                    feedback: lead.feedback // Inherit remark from Round 1
                }
            });
        });

        await Promise.all(updatePromises);

        res.status(200).json({ message: "Round 2 started successfully. Leads copied to Round 2." });
    } catch (error) {
        console.error("Call Center startRound error:", error);
        res.status(500).json({ error: "Failed to start next round" });
    }
};

