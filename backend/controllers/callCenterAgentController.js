const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

exports.getOverview = async (req, res) => {
    try {
        const agentId = req.user?.id || req.user?.userId;
        if (!agentId) return res.status(401).json({ error: "Unauthorized" });

        // Get all assigned leads for this agent
        const leads = await prisma.lead.findMany({
            where: {
                isCallCenter: true,
                assignedTo: parseInt(agentId)
            },
            include: {
                batch: { include: { business: true } },
                roundProgress: true
            }
        });

        const allBusinesses = await prisma.business.findMany();
        const bizMap = new Map(allBusinesses.map(b => [b.id, b]));

        // Group by Campaign Type (AFTER_SEMINAR / FREE_SEMINAR) and Business
        const overview = {
            AFTER_SEMINAR: {},
            FREE_SEMINAR: {},
            BRIDGE: {}
        };

        leads.forEach(lead => {
            let biz = lead.batch?.business;
            if (!biz) {
                const match = lead.phone?.match(/_BIZ_(\d+)/);
                if (match) {
                    biz = bizMap.get(parseInt(match[1]));
                }
            }
            if (!biz) return;
            
            let cType = lead.campaignType;
            if (cType === 'AFTER_SEMINAR' && lead.source === 'bridge_transfer') {
                cType = 'BRIDGE';
            } else if (cType === 'AFTER_SEMINAR' && lead.source !== 'bridge_transfer') {
                cType = 'AFTER_SEMINAR';
            }

            if (!overview[cType]) return;

            if (!overview[cType][biz.id]) {
                overview[cType][biz.id] = {
                    business: biz,
                    totalAssigned: 0,
                    completed: 0,
                    pending: 0
                };
            }

            overview[cType][biz.id].totalAssigned++;
            
            // Check active round
            const r2 = lead.roundProgress?.find(r => r.roundNum === 2);
            let cStatus = '';
            
            if (r2) {
                cStatus = (r2.callStatus || '').toUpperCase();
            } else {
                cStatus = (lead.callStatus || lead.roundProgress?.[0]?.callStatus || '').toUpperCase();
            }

            const coveredStatuses = ['ANSWERED', 'ANSWER', 'REJECT', 'REJECTED', 'NO_ANSWER', 'CALL_AGAIN', 'FOLLOW_UP', 'NOT_INTERESTED', 'ENROLLED', 'COMPLETED'];
            const isCovered = coveredStatuses.includes(cStatus) || lead.callCenterStatus === 'completed';

            if (isCovered) {
                overview[cType][biz.id].completed++;
            } else {
                overview[cType][biz.id].pending++;
            }
        });

        // Convert to arrays
        const result = {
            AFTER_SEMINAR: Object.values(overview.AFTER_SEMINAR),
            FREE_SEMINAR: Object.values(overview.FREE_SEMINAR),
            BRIDGE: Object.values(overview.BRIDGE || {})
        };

        res.status(200).json(safeJson(result));
    } catch (error) {
        console.error("Agent getOverview error:", error);
        res.status(500).json({ error: "Failed to fetch overview" });
    }
};

exports.getBusinessLeads = async (req, res) => {
    try {
        const agentId = req.user?.id || req.user?.userId;
        const { businessId, campaignType, batchId } = req.query;

        if (!agentId) return res.status(401).json({ error: "Unauthorized" });

        const bizIdInt = parseInt(businessId);
        const whereClause = {
            assignedTo: parseInt(agentId),
            OR: [
                { batch: { businessId: bizIdInt } },
                { phone: { contains: `_BIZ_${bizIdInt}` } }
            ]
        };

        if (campaignType === 'BRIDGE') {
            whereClause.campaignType = 'AFTER_SEMINAR';
            whereClause.source = 'bridge_transfer';
        } else if (campaignType === 'AFTER_SEMINAR') {
            whereClause.campaignType = 'AFTER_SEMINAR';
            whereClause.source = { not: 'bridge_transfer' };
        } else {
            whereClause.campaignType = campaignType;
        }

        if (batchId && batchId !== 'All') {
            whereClause.batchId = parseInt(batchId);
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                batch: { include: { business: true } },
                roundProgress: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        const biz = await prisma.business.findUnique({ where: { id: bizIdInt } });
        const enrichedLeads = leads.map(l => {
            if (!l.batch && biz) {
                return {
                    ...l,
                    batch: {
                        id: 0,
                        name: 'General Bridge Pool',
                        business: biz
                    }
                };
            }
            return l;
        });

        res.status(200).json(safeJson(enrichedLeads));
    } catch (error) {
        console.error("Agent getBusinessLeads error:", error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
};

exports.updateProgress = async (req, res) => {
    try {
        const agentId = req.user?.id || req.user?.userId;
        const { leadId, leadStatus, payPlan, callMethod, attempts, feedback, callOutcome } = req.body;

        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(leadId) }
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });
        if (lead.assignedTo !== parseInt(agentId)) {
            return res.status(403).json({ error: "Access denied." });
        }

        const updateData = {};
        const { roundNum } = req.body; // e.g., 1 or 2
        const isRoundTwo = parseInt(roundNum) === 2;
        
        // For Round 1 (base lead) or Round 2 (LeadRoundProgress)
        // Note: we only update the active table.
        if (isRoundTwo) {
            if (callMethod) updateData.callMethod = callMethod;
            if (attempts !== undefined) updateData.callAttempt = parseInt(attempts);
            if (feedback !== undefined) updateData.feedback = feedback;

            if (callOutcome) {
                updateData.callStatus = callOutcome;
                let currentPhase = 1;
                const progressRecord = await prisma.leadRoundProgress.findUnique({
                    where: { leadId_roundNum: { leadId: parseInt(leadId), roundNum: 2 } }
                });
                if (progressRecord) currentPhase = progressRecord.phase;

                if (callOutcome === 'NO_ANSWER') {
                    if (currentPhase < 3) {
                        updateData.phase = currentPhase + 1;
                    }
                }
            }

            const updatedProgress = await prisma.leadRoundProgress.upsert({
                where: {
                    leadId_roundNum: { leadId: parseInt(leadId), roundNum: 2 }
                },
                update: updateData,
                create: {
                    leadId: parseInt(leadId),
                    roundNum: 2,
                    ...updateData
                }
            });
            return res.status(200).json(safeJson(updatedProgress));

        } else {
            // Round 1 Updates
            if (leadStatus) updateData.enrollmentStatus = leadStatus;
            if (payPlan) updateData.paymentIntention = payPlan;
            if (callMethod) updateData.callMethod = callMethod;
            if (attempts !== undefined) updateData.callAttempt = parseInt(attempts);
            if (feedback !== undefined) updateData.feedback = feedback;

            if (callOutcome) {
                updateData.callStatus = callOutcome;
                
                if (callOutcome === 'NO_ANSWER') {
                    if (lead.phase < 3) {
                        updateData.phase = lead.phase + 1;
                        updateData.callCenterStatus = 'pending';
                    } else {
                        updateData.callCenterStatus = 'completed';
                    }
                } else if (['ANSWERED', 'REJECT'].includes(callOutcome.toUpperCase())) {
                    updateData.callCenterStatus = 'completed';
                }
            }

            const updatedLead = await prisma.lead.update({
                where: { id: parseInt(leadId) },
                data: updateData
            });

            return res.status(200).json(safeJson(updatedLead));
        }
    } catch (error) {
        console.error("Agent updateProgress error:", error);
        res.status(500).json({ error: "Failed to update progress" });
    }
};
