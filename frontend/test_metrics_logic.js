function calculateMetrics(rawLeads, monthlyGroups, targetMonthName, searchQuery, activeAttemptFilter) {
    const targetIdx = monthlyGroups.findIndex(g => g.name === targetMonthName);
    const m0 = targetIdx >= 0 ? monthlyGroups[targetIdx] : null;
    const m1 = targetIdx >= 1 ? monthlyGroups[targetIdx - 1] : null;
    const m2 = targetIdx >= 2 ? monthlyGroups[targetIdx - 2] : null;

    const monthStats = {
        m0: { name: m0?.name || 'Selected Month', total: 0, full: 0, monthly: 0, drops: 0, expected: 0 },
        m1: { name: m1?.name || 'Previous Month 1', total: 0, full: 0, monthly: 0, drops: 0, expected: 0 },
        m2: { name: m2?.name || 'Previous Month 2', total: 0, full: 0, monthly: 0, drops: 0, expected: 0 }
    };

    let staffMap = {};

    rawLeads.forEach(l => {
        const matchesSearch = (l.phone || '').includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return;

        const intention = l.paymentIntention || 'NOT_DECIDED';
        const isPending = l.callStatus === 'pending' || !l.callStatus;
        const attempt = l.callAttempt || 1;
        const enrolledGroupIds = l.enrolledGroupIds || [];

        // Month Stats
        [
            { key: 'm0', group: m0, prevGroup: m1 },
            { key: 'm1', group: m1, prevGroup: m2 },
            { key: 'm2', group: m2, prevGroup: targetIdx >= 3 ? monthlyGroups[targetIdx - 3] : null }
        ].forEach(({ key, group, prevGroup }) => {
            if (!group) return;
            if (intention === 'FULL' && l.enrollmentStatus === 'ENROLLED') {
                monthStats[key].full++;
                monthStats[key].total++;
            } else if (intention === 'MONTHLY' || intention === 'INSTALLMENT') {
                const paidThisMonth = enrolledGroupIds.some(id => group.ids.includes(id));
                const paidPrevMonth = prevGroup ? enrolledGroupIds.some(id => prevGroup.ids.includes(id)) : false;

                if (paidThisMonth) {
                    monthStats[key].monthly++;
                    monthStats[key].total++;
                }

                if (paidPrevMonth) {
                    monthStats[key].expected++;
                    if (!paidThisMonth) {
                        monthStats[key].drops++;
                    }
                }
            }
        });

        if (activeAttemptFilter !== 'ALL' && attempt !== activeAttemptFilter) {
            return;
        }

        if (l.assignedTo) {
            const sName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName || ''}`.trim() : 'Unknown';
            if (!staffMap[sName]) {
                staffMap[sName] = { 
                    name: sName, assigned: 0,
                    categories: {
                        full: { pending: 0, covered: 0 },
                        monthly: { pending: 0, covered: 0 },
                        installment: { pending: 0, covered: 0 },
                        nonEnrolled: { pending: 0, covered: 0 },
                        twoMonthDrop: { pending: 0, covered: 0 }
                    }
                };
            }
            const s = staffMap[sName];
            s.assigned++;

            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            let unpaidCount = 0;
            if (targetIdx >= 0 && intention !== 'FULL') {
                for (let i = 0; i <= targetIdx; i++) {
                    const pm = monthlyGroups[i];
                    const hasPaid = pm.ids.some(id => enrolledGroupIds.includes(id));
                    if (!hasPaid) unpaidCount++;
                }
            }

            let catKey = '';
            if (isEnrolled && intention === 'FULL') catKey = 'full';
            else if (isEnrolled && intention === 'MONTHLY') catKey = 'monthly';
            else if (isEnrolled && intention === 'INSTALLMENT') catKey = 'installment';
            else if (!isEnrolled && unpaidCount >= 2) catKey = 'twoMonthDrop';
            else if (!isEnrolled) catKey = 'nonEnrolled';
            
            if (catKey) {
                if (isPending) s.categories[catKey].pending++;
                else s.categories[catKey].covered++;
            }
        }
    });

    Object.values(monthStats).forEach(ms => {
        ms.dropPercent = ms.expected > 0 ? Math.round((ms.drops / ms.expected) * 100) : 0;
    });

    console.log(JSON.stringify(monthStats, null, 2));
    console.log(JSON.stringify(Object.values(staffMap), null, 2));
}

calculateMetrics([
    { phone: '123', assignedTo: 1, assignedUser: { firstName: 'Agent' }, paymentIntention: 'MONTHLY', enrollmentStatus: 'NON_ENROLLED', enrolledGroupIds: [1, 2], callStatus: 'pending', callAttempt: 1 }
], [
    { name: 'OCT', ids: [1] },
    { name: 'NOV', ids: [2] },
    { name: 'DEC', ids: [3] }
], 'DEC', '', 'ALL');
