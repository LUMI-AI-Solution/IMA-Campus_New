import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx', 'r') as f:
    opensem = f.read()

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

# We need to extract the UI sections from opensem and inject them into newinq.

# Extract Stats block from opensem
stats_block = re.search(r'\{/\* Stats & Filters Box \*/\}(.*?)\{/\* Main Leads Grid \*/\}', opensem, re.DOTALL).group(1)

# Extract Main Leads Grid block from opensem
leads_grid_block = re.search(r'\{/\* Main Leads Grid \*/\}(.*)\{/\* Pagination \*/\}', opensem, re.DOTALL).group(1)

# Modify leads_grid_block to use NewInq functions and states
# In NewInq, drafts are used for remark, but OpenSem uses draftStatus, draftAttempt, draftMethod. We need to add those to NewInq.
# In OpenSem, we map over paginatedLeads. In NewInq, we map over groupedLeads and then paginatedLeads.
# Since we want EXACT OpenSem UI but with date grouping ONLY for R1, we can wrap the OpenSem grid code in a map over groupedLeads.

