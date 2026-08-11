import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# Replace groupedLeads block
old_grouped = re.search(r'const groupedLeads = useMemo\(\(\) => \{.*?return Object.values\(groups\)\.sort\(\(a, b\) => b\.timestamp - a\.timestamp\);\n    \}, \[filteredLeads\]\);', newinq, re.DOTALL).group(0)

new_grouped = """const groupedLeads = useMemo(() => {
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
                targetDate = lead.roundProgress?.[0]?.updatedAt || lead.assignedAt || lead.newInqTimestamp || lead.createdAt;
            }
            const shiftInfo = getShiftData(targetDate);
            const label = shiftInfo.label;
            if (!groups[label]) groups[label] = { label: label, timestamp: shiftInfo.timestamp, leads: [] };
            groups[label].leads.push(lead);
        });
        return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    }, [filteredLeads, activeRound, r2Tab]);"""

newinq = newinq.replace(old_grouped, new_grouped)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("Grouped Leads block replaced successfully")
