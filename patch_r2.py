import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# Add r2Tab
if "const [r2Tab" not in newinq:
    newinq = newinq.replace("const [activeRound, setActiveRound] = useState('r1');", "const [activeRound, setActiveRound] = useState('r1');\n    const [r2Tab, setR2Tab] = useState('ACTIVE');")

# Also add finalFilteredLeads and paginatedLeads fixes since we want pagination on filtered
finalLeadsCode = """
    const finalFilteredLeads = useMemo(() => {
        if (activeRound === 'r2') {
            return filteredLeads.filter(l => r2Tab === 'DELAYED' ? isLeadDelayed(l) : !isLeadDelayed(l));
        }
        return filteredLeads;
    }, [filteredLeads, activeRound, r2Tab, isLeadDelayed]);

    const totalPages = Math.ceil(finalFilteredLeads.length / ITEMS_PER_PAGE);
    const paginatedLeads = finalFilteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
"""
# Replace paginatedLeads
newinq = re.sub(r'const paginatedLeads = filteredLeads.*?ITEMS_PER_PAGE\);', finalLeadsCode, newinq, flags=re.DOTALL)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("r2Tab added successfully")
