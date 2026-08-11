const fs = require('fs');
const file = '/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js';
let content = fs.readFileSync(file, 'utf8');

const oldFilter = `            // 3. Round Filter
            if (round && round !== '') whereClause.coordinationRound = parseInt(round);`;

const newFilter = `            // 3. Round Filter
            if (round && round !== '') {
                const parsedRound = parseInt(round);
                const isOpenseminar = subTab === 'OPEN_SEMINAR' || inquiryType?.includes('OPEN_SEMINAR') || inquiryType === 'OPEN_SEMINAR';
                
                if (isOpenseminar) {
                    const fourteenDaysAgo = new Date();
                    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                    if (parsedRound === 3) {
                        whereClause.AND = whereClause.AND || [];
                        whereClause.AND.push({
                            OR: [
                                { openSemRound: 3 },
                                {
                                    assignedAt: { lte: fourteenDaysAgo },
                                    enrollmentStatus: { not: 'ENROLLED' }
                                }
                            ]
                        });
                    } else {
                        whereClause.openSemRound = parsedRound;
                        whereClause.AND = whereClause.AND || [];
                        whereClause.AND.push({
                            OR: [
                                { assignedAt: { gt: fourteenDaysAgo } },
                                { assignedAt: null } // Fallback for old leads
                            ]
                        });
                    }
                } else {
                    whereClause.coordinationRound = parsedRound;
                }
            }`;

content = content.replace(oldFilter, newFilter);
fs.writeFileSync(file, content);
console.log('whereClause fixed in getCampaignLeads');
