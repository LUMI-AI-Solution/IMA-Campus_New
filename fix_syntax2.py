import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# Replace duplicate totalPages
newinq = re.sub(r'const totalPages = Math\.ceil\(finalFilteredLeads\.length / ITEMS_PER_PAGE\);\n    const paginatedLeads = finalFilteredLeads.*?ITEMS_PER_PAGE\);\n\n    const totalPages = Math\.ceil\(finalFilteredLeads\.length / ITEMS_PER_PAGE\);\n    const paginatedLeads = finalFilteredLeads.*?ITEMS_PER_PAGE\);', 'const totalPages = Math.ceil(finalFilteredLeads.length / ITEMS_PER_PAGE);\n    const paginatedLeads = finalFilteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);', newinq, flags=re.DOTALL)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("Syntax fixed")
