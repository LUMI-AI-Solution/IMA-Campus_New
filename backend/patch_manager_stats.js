        // 2. Combined Stats & Advanced Staff Breakdown
        let stats = { totalLeads: leads.length, assignedLeads: 0, unassignedLeads: 0, openSemLeads: 0, newInqLeads: 0, bridgeLeads: 0 };
        let staffMap = {};
        
        let totalContacted = 0;
        let totalAnswered = 0;
        let totalNoAnswer = 0;
        let totalReject = 0;
        let totalActualPending = 0;
        let totalDirectPaid = 0;
        let totalEnrolled = 0;
        let totalDelayed = 0;

        const primaryEnrolledLeadIds = await getPrimaryEnrolledLeadIds(businessId, batchId, verifiedPhones);

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const globalCourseMap = {};
        allCourses.forEach(c => globalCourseMap[c.id] = c.name.trim().toUpperCase());

        const realCourses = await prisma.course.findMany({ where: courseWhere, select: { id: true, name: true } });
        const subjectAggregates = {};
        realCourses.forEach(c => {
            const upName = c.name.trim().toUpperCase();
            subjectAggregates[upName] = { id: c.id, subject: c.name, full: 0, monthly: 0, installment: 0, totalEnrolled: 0 };
        });

        for (const l of leads) {
            if (l.source === 'bridge_transfer') stats.bridgeLeads++;
            else if (l.inquiryType === 'NEW_INQ') stats.newInqLeads++;
            else stats.openSemLeads++;

            if (l.assignedTo && activeStaffIds.has(l.assignedTo)) {
                stats.assignedLeads++;
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown`;
                
                if (!staffMap[staffName]) {
                    staffMap[staffName] = {
                        name: staffName,
                        businessType: l.assignedUser?.businessType || 'OTHER',
                        role: l.assignedUser?.role || 'COORDINATOR',
                        overall: {
                            assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0, enrolled: 0, full: 0, upgrade: 0, monthly: 0, installment: 0, directPaid: 0, r1HistoricalDelays: 0, r2HistoricalDelays: 0
                        },
                        rounds: {
                            1: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0 },
                            2: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0 },
                            NON_ENROLLED: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0, delayed: 0 },
                            PAID: { assigned: 0, contacted: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0 }
                        }
                    };
                }

                // Determine dynamic status fields based on whether it is Open Sem or New Inq
                let round = 1;
                let cStatus = 'pending';
                let fb = '';
                
                if (l.inquiryType === 'NEW_INQ') {
                    round = l.newInqRound || 1;
                    cStatus = (l.newInqCallStatus || 'pending').toLowerCase();
                    fb = (l.newInqFeedback || '').toLowerCase();
                } else {
                    round = l.openSemRound || 1;
                    cStatus = (l.openSemCallStatus || 'pending').toLowerCase();
                    fb = (l.openSemFeedback || '').toLowerCase();
                }
                
                // If enrolled in real DB
                let isEnrolled = false;
                if (primaryEnrolledLeadIds.has(l.id)) {
                    isEnrolled = true;
                    round = 'PAID';
                }

                // Call Logic Evaluation
                const isContacted = ['answered', 'no answer', 'reject', 'call back'].includes(cStatus);
                const isAnswered = cStatus === 'answered' || isEnrolled;
                const isNoAnswer = cStatus === 'no answer';
                const isReject = cStatus === 'reject';
                const isDirectPaid = fb.includes('direct paid');

                let isDelayed = false;
                if (!isEnrolled && !isAnswered && !isReject) {
                    if (round === 1 && l.r1DelayedDays > 0) isDelayed = true;
                    if (round === 2 && l.r2DelayedDays > 0) isDelayed = true;
                }

                // Global Aggregates
                if (isContacted) totalContacted++;
                if (isAnswered) totalAnswered++;
                if (isNoAnswer) totalNoAnswer++;
                if (isReject) totalReject++;
                if (isDirectPaid) totalDirectPaid++;
                if (isDelayed) totalDelayed++;
                if (isEnrolled) totalEnrolled++;
                if (!isContacted && !isEnrolled && !isReject && cStatus === 'pending') totalActualPending++;

                // Overall Stats Update
                let bucket = 'pending';
                if (isReject) bucket = 'reject';
                else if (isNoAnswer) bucket = 'noAnswer';
                else if (isAnswered || isEnrolled || (isContacted && !isNoAnswer && !isReject)) bucket = 'answered';
                else bucket = 'pending';

                staffMap[staffName].overall.assigned++;
                staffMap[staffName].overall[bucket]++;
                if (isDelayed) staffMap[staffName].overall.delayed++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isDirectPaid) staffMap[staffName].overall.directPaid++;
                if (isEnrolled) {
                    staffMap[staffName].overall.enrolled++;
                    if (l.paymentIntention === 'FULL') staffMap[staffName].overall.full++;
                    else if (l.paymentIntention === 'UPGRADE') staffMap[staffName].overall.upgrade++;
                    else if (l.paymentIntention === 'MONTHLY') staffMap[staffName].overall.monthly++;
                    else if (l.paymentIntention === 'INSTALLMENTS' || l.paymentIntention === 'INSTALLMENT') staffMap[staffName].overall.installment++;
                }

                if (l.r1DelayedDays > 0) staffMap[staffName].overall.r1HistoricalDelays++;
                if (l.r2DelayedDays > 0) staffMap[staffName].overall.r2HistoricalDelays++;

                // Round-wise Stats Update
                let targetRound = 1;
                if (isEnrolled) targetRound = 'PAID';
                else if (round === 'NON_ENROLLED' || round >= 3) targetRound = 'NON_ENROLLED';
                else if (round === 2) targetRound = 2;
                else targetRound = 1;

                staffMap[staffName].rounds[targetRound].assigned++;
                staffMap[staffName].rounds[targetRound][bucket]++;
                if (isDelayed) staffMap[staffName].rounds[targetRound].delayed++;
                
            } else {
                stats.unassignedLeads++;
            }
        }
