import sys

filepath = 'backend/controllers/afterSeminarManagerStatsController.js'
with open(filepath, 'r') as f:
    content = f.read()

old_code = """                // Round-wise Stats Update & Lead Pushing
                
                if (round === 1 && !isEnrolled) {
                    staffMap[staffName].rounds[1].assigned++;
                    staffMap[staffName].rounds[1][bucket]++;
                    staffMap[staffName].rounds[1].leads.push(exportLead);
                }

                if (round === 2 && !isEnrolled) {
                    staffMap[staffName].rounds[2].assigned++;
                    staffMap[staffName].rounds[2][bucket]++;
                    staffMap[staffName].rounds[2].leads.push(exportLead);
                }

                if (isEnrolled) {
                    staffMap[staffName].rounds.PAID.assigned++;
                    staffMap[staffName].rounds.PAID[bucket === 'delayed' ? 'pending' : bucket]++;
                    staffMap[staffName].rounds.PAID.leads.push(exportLead);
                } else if (round >= 3) {
                    staffMap[staffName].rounds.NON_ENROLLED.assigned++;
                    staffMap[staffName].rounds.NON_ENROLLED[bucket === 'delayed' ? 'pending' : bucket]++;
                    staffMap[staffName].rounds.NON_ENROLLED.leads.push(exportLead);
                }"""

new_code = """                // 🔥 Mutually Exclusive Round-wise Stats Update 🔥
                if (isEnrolled) {
                    staffMap[staffName].rounds.PAID.assigned++;
                    staffMap[staffName].rounds.PAID[bucket === 'delayed' ? 'pending' : bucket]++;
                    staffMap[staffName].rounds.PAID.leads.push(exportLead);
                } 
                else if (round >= 3 || l.enrollmentStatus === 'NON_ENROLLED') {
                    staffMap[staffName].rounds.NON_ENROLLED.assigned++;
                    staffMap[staffName].rounds.NON_ENROLLED[bucket === 'delayed' ? 'pending' : bucket]++;
                    staffMap[staffName].rounds.NON_ENROLLED.leads.push(exportLead);
                } 
                else if (round === 2) {
                    staffMap[staffName].rounds[2].assigned++;
                    staffMap[staffName].rounds[2][bucket]++;
                    staffMap[staffName].rounds[2].leads.push(exportLead);
                } 
                else {
                    staffMap[staffName].rounds[1].assigned++;
                    staffMap[staffName].rounds[1][bucket]++;
                    staffMap[staffName].rounds[1].leads.push(exportLead);
                }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(filepath, 'w') as f:
        f.write(content)
    print("Patched successfully!")
else:
    print("Old code not found!")
