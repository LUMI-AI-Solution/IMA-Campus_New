import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

newinq = re.sub(r'const totalPages = Math\.ceil\(filteredLeads\.length / ITEMS_PER_PAGE\);\n    const paginatedLeads = filteredLeads.*?ITEMS_PER_PAGE\);\n', '', newinq, flags=re.DOTALL)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("Syntax fixed 3")
