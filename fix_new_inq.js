const fs = require('fs');

const openSemPath = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx';
const newInqPath = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx';

let content = fs.readFileSync(openSemPath, 'utf8');

// 1. Add getShiftData and change component name
const shiftDataStr = `
const getShiftData = (dateString) => {
    if (!dateString) return { dateStr: 'Unknown', label: 'Unknown Date', timestamp: 0 };
    const d = new Date(dateString);
    const shiftDate = new Date(d);
    if (d.getHours() < 8) shiftDate.setDate(shiftDate.getDate() - 1);
    shiftDate.setHours(0, 0, 0, 0);
    const now = new Date();
    const todayShift = new Date(now);
    if (now.getHours() < 8) todayShift.setDate(todayShift.getDate() - 1);
    todayShift.setHours(0, 0, 0, 0);
    const yesterdayShift = new Date(todayShift);
    yesterdayShift.setDate(yesterdayShift.getDate() - 1);
    if (shiftDate.getTime() === todayShift.getTime()) return { label: 'Today', timestamp: shiftDate.getTime() };
    else if (shiftDate.getTime() === yesterdayShift.getTime()) return { label: 'Yesterday', timestamp: shiftDate.getTime() };
    else return { label: shiftDate.toLocaleDateString('en-CA'), timestamp: shiftDate.getTime() };
};
`;
content = content.replace("export default function AfterSeminarOpenSem(", shiftDataStr + "\nexport default function AfterSeminarNewInq(");

// 2. Change OPEN_SEMINAR to NEW_INQ in leads filtering
content = content.replace(/l\?.inquiryType === 'OPEN_SEMINAR' \|\| l\?.inquiryType === 'NORMAL'/g, "l?.inquiryType === 'NEW_INQ'");
content = content.replace(/l\?.inquiryType === 'OPEN_SEMINAR'/g, "l?.inquiryType === 'NEW_INQ'");

// 3. Change SLA timer logic
const oldTimerLogic = `const isLeadDelayed = (l) => {
        if (l.enrollmentStatus === 'ENROLLED') return false;
        const startTime = l.updatedAt ? new Date(l.updatedAt).getTime() : new Date(l.assignedAt || l.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        return diffHours >= 120;
    };`;
    
const newTimerLogic = `const isLeadDelayed = (l) => {
        if (l.enrollmentStatus === 'ENROLLED') return false;
        if (!isLeadPending(l)) return false; 
        const startTime = l.updatedAt ? new Date(l.updatedAt).getTime() : new Date(l.assignedAt || l.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        return diffHours >= 24; 
    };`;
content = content.replace(oldTimerLogic, newTimerLogic);

const oldGetTimerText = `const getTimerDataText = (lead) => {
        if (!lead) return null;
        if (lead.enrollmentStatus === 'ENROLLED') return null;

        const startTime = lead.updatedAt ? new Date(lead.updatedAt).getTime() : new Date(lead.assignedAt || lead.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        const timeLeft = 120 - diffHours; // 5 days = 120 hours

        if (timeLeft > 0) {
            const days = Math.floor(timeLeft / 24);
            const hrs = Math.floor(timeLeft % 24);
            return { text: \`⏳ \${days}d \${hrs}h LEFT\`, isLate: false };
        } else {
            const lateHours = Math.abs(timeLeft);
            const days = Math.floor(lateHours / 24);
            const hrs = Math.floor(lateHours % 24);
            return { text: \`⚠️ -\${days}d \${hrs}h LATE\`, isLate: true };
        }
    };`;

const newGetTimerText = `const getTimerDataText = (lead) => {
        if (!lead) return null;
        if (lead.enrollmentStatus === 'ENROLLED') return null;

        const startTime = lead.updatedAt ? new Date(lead.updatedAt).getTime() : new Date(lead.assignedAt || lead.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        
        const isPending = isLeadPending(lead);
        const currentRound = lead.coordinationRound || 1;

        if (isPending) {
            const timeLeft = 24 - diffHours;
            if (timeLeft > 0) {
                const hrs = Math.floor(timeLeft);
                const mins = Math.floor((timeLeft - hrs) * 60);
                return { text: \`⏳ \${hrs}h \${mins}m LEFT\`, isLate: false };
            } else {
                const lateHours = Math.abs(timeLeft);
                const hrs = Math.floor(lateHours);
                const mins = Math.floor((lateHours - hrs) * 60);
                return { text: \`⚠️ -\${hrs}h \${mins}m LATE\`, isLate: true };
            }
        } else {
            const maxWaitHours = currentRound === 1 ? 120 : 168;
            const timeLeft = maxWaitHours - diffHours;
            if (timeLeft <= 0) return { text: \`✅ READY FOR NEXT\`, isLate: false };
            const days = Math.floor(timeLeft / 24);
            const hrs = Math.floor(timeLeft % 24);
            return { text: \`NEXT IN \${days}d \${hrs}h\`, isLate: false };
        }
    };`;
content = content.replace(oldGetTimerText, newGetTimerText);

// 4. Change Titles
content = content.replace("OPEN SEMINAR CAMPAIGN", "NEW INQUIRY CAMPAIGN");
content = content.replace("OPEN SEMINAR", "NEW INQUIRY");

// 5. Replace paginatedLeads with groupedLeads
const groupedLeadsLogic = `
    const groupedLeads = useMemo(() => {
        const groups = {};
        filteredLeads.forEach(lead => {
            if (!lead) return;
            let targetDate = lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            if (lead.phase > 1 || (lead.coordinationRound || 1) > 1 || (lead.callStatus && lead.callStatus !== 'pending')) {
                targetDate = lead.roundProgress?.[0]?.updatedAt || lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            }
            const shiftInfo = getShiftData(targetDate);
            const label = shiftInfo.label;
            if (!groups[label]) groups[label] = { label: label, timestamp: shiftInfo.timestamp, leads: [] };
            groups[label].leads.push(lead);
        });
        return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredLeads]);
`;
content = content.replace("const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);", "const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);\n" + groupedLeadsLogic);

// Replace the render block
const oldRenderBlock = `                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {paginatedLeads.map((lead, index) => {
                                    const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;`;

const newRenderBlock = `                            <div className="space-y-8 pb-10">
                                {groupedLeads.map((group, gIdx) => (
                                    <div key={gIdx} className="space-y-4">
                                        <div className="sticky top-0 z-10 py-1 backdrop-blur-md">
                                            <div className="flex justify-between items-center bg-[#1e293b]/95 border border-slate-700/50 rounded-xl px-5 py-3 shadow-lg">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">{group.label}</h3>
                                                <div className="text-xs font-bold text-slate-300 bg-black/30 px-3 py-1 rounded border border-white/10">{group.leads.length} Leads</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {group.leads.map((lead, index) => {
                                                const realIndex = index + 1;`;
content = content.replace(oldRenderBlock, newRenderBlock);

const oldMapEnd = `                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>`;

const newMapEnd = `                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>`;
content = content.replace(oldMapEnd, newMapEnd);

// Remove pagination section to avoid bugs since we're using groupedLeads without slicing
content = content.replace(/\{\/\* Pagination \*\/\}(.|\n)*?\<\/\div\>\n\s*\)\}\n\s*\<\/\div\>/m, "</div>");

fs.writeFileSync(newInqPath, content);
console.log("Successfully regenerated AfterSeminarNewInq.jsx!");
