const fs = require('fs');
const path = './backend/controllers/dataExportController.js';
let content = fs.readFileSync(path, 'utf8');

const oldInclude = `include: {
                assignedUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }`;

const newInclude = `include: {
                assignedUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                messages: true
            }`;

content = content.replace(oldInclude, newInclude);

const oldMapInit = `const coordinatorMap = {};`;
const newMapInit = `const coordinatorMap = {};
        const getMonthYear = (dateStr) => {
            if (!dateStr) return 'Unknown';
            const d = new Date(dateStr);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        };`;

content = content.replace(oldMapInit, newMapInit);

const oldCoordinatorObj = `growth: 0 // We'll define growth as Monthly to Full upgrade or Active students
                };`;
const newCoordinatorObj = `growth: 0,
                    monthlyTrends: {}, // e.g. { '2024-05': { enrolled: 5, drops: 1, growth: 2 } }
                    msgStats: {
                        totalMessages: 0,
                        unreadChats: 0,
                        openSem: { incomingLeads: new Set(), repliedLeads: new Set(), unread: 0 },
                        newInq: { incomingLeads: new Set(), repliedLeads: new Set(), unread: 0 }
                    }
                };`;

content = content.replace(oldCoordinatorObj, newCoordinatorObj);

const oldCalc = `} else if (lead.paymentIntention === 'NOT_DECIDED') {
                    c.drops++; // or whatever logic
                }
            } else {
                c.totalNonEnrolled++;
            }
        });`;

const newCalc = `} else if (lead.paymentIntention === 'NOT_DECIDED') {
                    c.drops++; // or whatever logic
                }
            } else {
                c.totalNonEnrolled++;
            }

            // Monthly Trend Aggregation (using lead createdAt as base)
            const monthStr = getMonthYear(lead.createdAt || new Date());
            if (!c.monthlyTrends[monthStr]) {
                c.monthlyTrends[monthStr] = { month: monthStr, enrolled: 0, drops: 0, growth: 0 };
            }
            if (lead.enrollmentStatus === 'ENROLLED') {
                c.monthlyTrends[monthStr].enrolled++;
                if (lead.paymentIntention === 'FULL') c.monthlyTrends[monthStr].growth++;
                if (lead.paymentIntention === 'NOT_DECIDED') c.monthlyTrends[monthStr].drops++;
            }

            // Messaging Stats Aggregation
            if (lead.messages && lead.messages.length > 0) {
                c.msgStats.totalMessages += lead.messages.length;
                let hasUnread = false;
                
                const inqType = lead.inquiryType === 'NEW_INQ' ? 'newInq' : 'openSem';
                
                lead.messages.forEach(msg => {
                    if (msg.direction === 'IN') {
                        c.msgStats[inqType].incomingLeads.add(lead.id);
                        if (!msg.isRead) hasUnread = true;
                    } else if (msg.direction === 'OUT') {
                        c.msgStats[inqType].repliedLeads.add(lead.id);
                    }
                });
                
                if (hasUnread) {
                    c.msgStats.unreadChats++;
                    c.msgStats[inqType].unread++;
                }
            }
        });`;

content = content.replace(oldCalc, newCalc);

const oldConversion = `        // Calculate Conversion Rate
        const result = Object.values(coordinatorMap).map(c => ({
            ...c,
            conversionRate: c.totalAssigned > 0 ? ((c.totalEnrolled / c.totalAssigned) * 100).toFixed(1) : '0.0'
        }));`;

const newConversion = `        // Calculate Conversion Rate & formatting Maps
        const result = Object.values(coordinatorMap).map(c => {
            const formattedTrends = Object.values(c.monthlyTrends).sort((a,b) => a.month.localeCompare(b.month));
            return {
                ...c,
                conversionRate: c.totalAssigned > 0 ? ((c.totalEnrolled / c.totalAssigned) * 100).toFixed(1) : '0.0',
                monthlyTrendsArray: formattedTrends,
                messageSummary: {
                    totalMessages: c.msgStats.totalMessages,
                    unreadChats: c.msgStats.unreadChats,
                    openSem: {
                        incomingLeads: c.msgStats.openSem.incomingLeads.size,
                        repliedLeads: c.msgStats.openSem.repliedLeads.size,
                        unread: c.msgStats.openSem.unread
                    },
                    newInq: {
                        incomingLeads: c.msgStats.newInq.incomingLeads.size,
                        repliedLeads: c.msgStats.newInq.repliedLeads.size,
                        unread: c.msgStats.newInq.unread
                    }
                }
            };
        });`;

content = content.replace(oldConversion, newConversion);

fs.writeFileSync(path, content);
console.log('Patched');
