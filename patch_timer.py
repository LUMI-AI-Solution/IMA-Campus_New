import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

new_timer = """const getTimerDataText = (lead) => {
        if (!lead) return null;
        if (lead.enrollmentStatus === 'ENROLLED') return null;

        const startTime = lead.updatedAt ? new Date(lead.updatedAt).getTime() : new Date(lead.assignedAt || lead.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);
        
        const currentRound = lead.coordinationRound || 1;
        const isPending = !['answered', 'reject'].includes(lead.callStatus);

        if (isPending) {
            const timeLeft = 24 - diffHours;
            if (timeLeft > 0) {
                const hrs = Math.floor(timeLeft);
                const mins = Math.floor((timeLeft - hrs) * 60);
                return { text: `⏳ ${hrs}h ${mins}m LEFT`, isLate: false };
            } else {
                const lateHours = Math.abs(timeLeft);
                const hrs = Math.floor(lateHours);
                const mins = Math.floor((lateHours - hrs) * 60);
                return { text: `⚠️ -${hrs}h ${mins}m LATE`, isLate: true };
            }
        } else {
            const maxWaitHours = currentRound === 1 ? 24 : 168;
            const timeLeft = maxWaitHours - diffHours;
            if (timeLeft <= 0) return { text: `✅ READY FOR NEXT`, isLate: false };
            const days = Math.floor(timeLeft / 24);
            const hrs = Math.floor(timeLeft % 24);
            return { text: `FREEZE: ${days}d ${hrs}h`, isLate: false };
        }
    };"""

old_timer = re.search(r'const getTimerDataText = \(lead\) => \{.*?\n    \};', newinq, re.DOTALL)
if old_timer:
    newinq = newinq.replace(old_timer.group(0), new_timer)
    print("Patched successfully")
else:
    print("Could not find getTimerDataText")

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)

