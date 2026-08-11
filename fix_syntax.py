import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# Remove the duplicate totalPages and paginatedLeads declarations
# We want to keep the one that uses finalFilteredLeads (the one we added) and remove the one using filteredLeads
newinq = re.sub(r'const totalPages = Math\.ceil\(filteredLeads\.length / ITEMS_PER_PAGE\);\n    const paginatedLeads = filteredLeads.*?ITEMS_PER_PAGE\);', '', newinq, flags=re.DOTALL)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("Syntax fixed")
