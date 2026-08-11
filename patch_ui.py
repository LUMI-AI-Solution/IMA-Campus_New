import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx', 'r') as f:
    opensem = f.read()

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# 1. Add missing imports
if 'FaUser' not in newinq:
    newinq = newinq.replace("import { FaSearch, FaCommentDots, FaArrowRight, FaTimes, FaBell, FaSave, FaTrash, FaCheckCircle } from 'react-icons/fa';", "import { FaSearch, FaCommentDots, FaArrowRight, FaTimes, FaBell, FaSave, FaTrash, FaCheckCircle, FaExclamationCircle, FaUser, FaMapMarkerAlt, FaGraduationCap, FaCreditCard, FaInfoCircle } from 'react-icons/fa';")

# 2. Add state hooks
hooks_to_insert = """
    const [draftStatus, setDraftStatus] = useState({});
    const [draftAttempt, setDraftAttempt] = useState({});
    const [draftMethod, setDraftMethod] = useState({});
    const [viewMode, setViewMode] = useState('TILE'); // 'TILE' or 'TABLE'
    
    const [studentDetailsLead, setStudentDetailsLead] = useState(null);
    const [studentDetailsData, setStudentDetailsData] = useState(null);
    const [isStudentDetailsLoading, setIsStudentDetailsLoading] = useState(false);

    useEffect(() => {
        if (studentDetailsLead?.phone) {
            setIsStudentDetailsLoading(true);
            const phone = studentDetailsLead.phone.split('_')[0].replace(/[^0-9]/g, '');
            axios.get(`/coordinator-crm/lead-details/${phone}`)
                .then(res => {
                    setStudentDetailsData(res.data);
                    setIsStudentDetailsLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching student details", err);
                    // toast.error("Failed to fetch student details.");
                    setIsStudentDetailsLoading(false);
                });
        } else {
            setStudentDetailsData(null);
        }
    }, [studentDetailsLead]);

    const getPaymentOption = (payment) => {
        if (!payment) return "N/A";
        let typeStr = payment.payment_type === 1 ? "Monthly" : payment.payment_type === 2 ? "Installment" : "Full Payment";
        return `${typeStr} via ${payment.method || 'Slip'}`;
    };
"""

if 'const [viewMode, setViewMode]' not in newinq:
    newinq = newinq.replace("const [remindNote, setRemindNote] = useState('');", "const [remindNote, setRemindNote] = useState('');\n" + hooks_to_insert)

# 3. Modify groupedLeads logic
old_grouped_leads = re.search(r'const groupedLeads = useMemo\(\(\) => \{.*?return Object.values\(groups\)\.sort\(\(a, b\) => b\.timestamp - a\.timestamp\);\n    \}, \[filteredLeads, activeRound\]\);', newinq, re.DOTALL).group(0)

new_grouped_leads = """const groupedLeads = useMemo(() => {
        if (activeRound === 'r2') {
            const activeR2 = filteredLeads.filter(l => !isLeadDelayed(l));
            const delayedR2 = filteredLeads.filter(l => isLeadDelayed(l));
            
            const selectedLeads = r2Tab === 'ACTIVE' ? activeR2 : delayedR2;
            const label = r2Tab === 'ACTIVE' ? 'ACTIVE LEADS' : 'DELAYED LEADS';

            return [{ label, timestamp: 0, leads: selectedLeads, total: filteredLeads.length, activeCount: activeR2.length, delayedCount: delayedR2.length }];
        }
        
        if (activeRound !== 'r1') {
            return [{ label: activeRound === 'enrolled' ? 'Paid Leads' : activeRound === 'non_enrolled' ? 'Non-Enrolled Leads' : 'Leads', timestamp: 0, leads: filteredLeads }];
        }

        const groups = {};
        filteredLeads.forEach(lead => {
            if (!lead) return;
            let targetDate = lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            if (lead.phase > 1 || (lead.coordinationRound || 1) > 1 || (lead.callStatus && lead.callStatus !== 'pending')) {
                targetDate = lead.roundProgress?.[0]?.createdAt || lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            }
            const shiftInfo = getShiftData(targetDate);
            const label = shiftInfo.label;
            if (!groups[label]) groups[label] = { label: label, timestamp: shiftInfo.timestamp, leads: [] };
            groups[label].leads.push(lead);
        });
        return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredLeads, activeRound, r2Tab]);"""

newinq = newinq.replace(old_grouped_leads, new_grouped_leads)

# 4. Modify localHandleSave so it uses draftStatus, draftAttempt, draftMethod instead of lead.callStatus etc.
old_localHandleSave = re.search(r'const handleLocalSaveCallData = async \(leadId\) => \{.*?setDrafts\(prev => \{ const n = \{\.\.\.prev\}; delete n\[leadId\]; return n; \}\);\n        \} catch \(error\) \{', newinq, re.DOTALL).group(0)

new_localHandleSave = """const handleLocalSaveCallData = async (leadId) => {
        const lead = leads.find(l => l.id === leadId);
        const feedback = drafts[leadId] || lead.feedback || '';
        const finalStatus = draftStatus[leadId] || lead.callStatus || 'pending';
        const finalAttempt = draftAttempt[leadId] || lead.callAttempt || 1;
        const finalMethod = draftMethod[leadId] || lead.callMethod || 'direct';

        if (finalStatus === 'pending') {
            toast.error('Please select an Outcome before saving.');
            return;
        }

        const loadToast = toast.loading("Saving progress...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/update-call', {
                leadId,
                method: finalMethod,
                status: finalStatus,
                feedback,
                coordinationRound: lead.coordinationRound || 1,
                paymentIntention: lead.paymentIntention || 'NOT_DECIDED',
                enrollmentStatus: lead.enrollmentStatus || 'NON_ENROLLED'
            }, { headers: { Authorization: `Bearer ${token}` } });

            handleUpdateLocalLead(leadId, 'feedback', feedback);
            handleUpdateLocalLead(leadId, 'callStatus', finalStatus);
            handleUpdateLocalLead(leadId, 'callAttempt', finalAttempt);
            handleUpdateLocalLead(leadId, 'callMethod', finalMethod);

            let currentRound = lead.coordinationRound || 1;
            
            // Note: the original NewInq localHandleSave didn't auto-push. We keep original logic for now
            // just to update the local lead accurately.
            
            setDraftStatus(prev => { const n = {...prev}; delete n[leadId]; return n; });
            setDraftAttempt(prev => { const n = {...prev}; delete n[leadId]; return n; });
            setDraftMethod(prev => { const n = {...prev}; delete n[leadId]; return n; });
            setDrafts(prev => { const n = {...prev}; delete n[leadId]; return n; });
        } catch (error) {"""

newinq = newinq.replace(old_localHandleSave, new_localHandleSave)

# 5. Extract UI block from OpenSem
opensem_stats_and_filters = re.search(r'\{/\* Stats & Filters Box \*/\}(.*?)\{/\* Main Leads Grid \*/\}', opensem, re.DOTALL).group(0)
opensem_grid_and_table = re.search(r'\{/\* Main Leads Grid \*/\}(.*?)\{/\* Pagination \*/\}', opensem, re.DOTALL).group(0)
opensem_student_modal = re.search(r'\{studentDetailsLead && \((.*?)\)\}', opensem, re.DOTALL).group(0)

# The OpenSem grid loops over `paginatedLeads`. In NewInq, we need to loop over `groupedLeads` and then `group.leads`.
# Wait, actually since `paginatedLeads` is used in OpenSem, if I just replace NewInq's grid with OpenSem's grid, we lose the group headers.
# I need to wrap OpenSem's grid inside the NewInq `groupedLeads` map.

# Let's extract the exact TILE and TABLE maps from OpenSem grid
tile_map = re.search(r'viewMode === \'TILE\' \? \((.*?)\) : \(', opensem_grid_and_table, re.DOTALL).group(1)
table_map = re.search(r'\) : \(\n\s*<div className="w-full overflow-x-auto(.*?)\)\n\s*\}', opensem_grid_and_table, re.DOTALL).group(1)
table_full = f'<div className="w-full overflow-x-auto{table_map}'

# We will generate a new Grid section for NewInq that iterates over groupedLeads, and conditionally renders TILE or TABLE, keeping the group headers!
new_leads_grid = f"""{{/* Main Leads Grid */}}
                    <div className="flex-1">
                        {{activeRound === 'r2' && groupedLeads[0] && (
                            <div className="bg-slate-900/40 rounded-2xl p-2 mb-6 border border-slate-700/50 flex flex-col md:flex-row items-center gap-4 justify-between">
                                <div className="relative px-5 flex items-center gap-4 w-full flex-wrap py-2">
                                    <button 
                                        onClick={{() => setR2Tab('ACTIVE')}}
                                        className={{`text-sm font-black uppercase tracking-widest px-5 py-2 rounded-xl transition-all border ${{r2Tab === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-black/20 text-emerald-500/50 border-emerald-900 hover:bg-emerald-900/30'}}`}}
                                    >
                                        <span className="opacity-70 text-xs mr-2">ACTIVE</span> {{groupedLeads[0].activeCount}} 
                                    </button>
                                    <button 
                                        onClick={{() => setR2Tab('DELAYED')}}
                                        className={{`text-sm font-black uppercase tracking-widest px-5 py-2 rounded-xl transition-all border ${{r2Tab === 'DELAYED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-black/20 text-rose-500/50 border-rose-900 hover:bg-rose-900/30'}}`}}
                                    >
                                        <span className="opacity-70 text-xs mr-2">DELAYED</span> {{groupedLeads[0].delayedCount}}
                                    </button>
                                    <div className="ml-auto text-xs font-bold text-slate-400 bg-[#0F172A] px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                                        Total: <span className="text-white ml-1">{{groupedLeads[0].total}}</span> Leads
                                    </div>
                                </div>
                            </div>
                        )}}
                        {{paginatedLeads.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl shadow-lg">
                                <PhoneCall className="text-slate-600 mx-auto mb-4" size={{48}} />
                                <h3 className="text-xl font-bold text-slate-400">No Leads Found</h3>
                                <p className="text-slate-500 mt-2">There are no leads matching your current filters.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-10">
                                {{groupedLeads.map((group, gIdx) => (
                                    <div key={{gIdx}} className="space-y-4">
                                        {{activeRound === 'r1' && (
                                            <div className="sticky top-0 z-10 py-2 backdrop-blur-sm mb-4">
                                                <div className="flex justify-between items-center relative py-2.5">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent border-l-4 border-emerald-500 rounded-r-2xl shadow-sm"></div>
                                                    <div className="relative px-5 flex items-center gap-2">
                                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-md">
                                                            {{group.label}}
                                                        </h3>
                                                    </div>
                                                    <div className="relative px-5">
                                                        <div className="text-xs font-bold text-emerald-200 bg-emerald-500/20 px-4 py-1 rounded-full border border-emerald-500/30 shadow-inner">
                                                            {{group.leads.length}} Leads
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}}
                                        
                                        {{viewMode === 'TILE' ? (
                                            {tile_map.replace('paginatedLeads.map', 'group.leads.map')}
                                        ) : (
                                            {table_full.replace('paginatedLeads.map', 'group.leads.map')}
                                        )}}
                                    </div>
                                ))}}
                            </div>
                        )}}
                    </div>
"""

# Now replace the UI blocks in newinq
newinq_stats = re.search(r'\{/\* Stats & Filters Box \*/\}(.*?)\{/\* Main Leads Grid \*/\}', newinq, re.DOTALL).group(0)
newinq = newinq.replace(newinq_stats, opensem_stats_and_filters)

newinq_grid = re.search(r'\{/\* Main Leads Grid \*/\}(.*?)\{/\* Pagination \*/\}', newinq, re.DOTALL).group(0)
newinq = newinq.replace(newinq_grid, new_leads_grid + '\n\n                        {/* Pagination */}')

# Add StudentDetailsModal at the end before final closing div
if 'StudentDetailsModal' not in newinq:
    newinq = newinq.replace('        </div>\n    );\n}', f'            {opensem_student_modal}\n        </div>\n    );\n}}')

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)

print("Patch applied successfully.")
