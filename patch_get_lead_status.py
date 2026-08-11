import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

old_getLeadStatusLabel = re.search(r'const getLeadStatusLabel = \(l\) => \{.*?\n    \};', newinq, re.DOTALL)
if old_getLeadStatusLabel:
    new_getLeadStatusLabel = """const getLeadStatusLabel = (l) => {
        if (!isLeadPending(l)) return null;

        const startTime = new Date(l.assignedAt || l.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - startTime) / (1000 * 60 * 60);

        const currentRound = l.coordinationRound || 1;

        if (isLeadDelayed(l)) {
            const maxWaitHours = currentRound === 1 ? 24 : 168;
            const lateHours = diffHours - maxWaitHours;
            const days = Math.floor(lateHours / 24);
            const hrs = Math.floor(lateHours % 24);
            
            if (days > 0) {
                return { text: `⚠️ -${days}d ${hrs}h LATE`, isLate: true };
            } else {
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
    newinq = newinq.replace(old_getLeadStatusLabel.group(0), new_getLeadStatusLabel)
else:
    print("Could not find getLeadStatusLabel")

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("getLeadStatusLabel patched")
