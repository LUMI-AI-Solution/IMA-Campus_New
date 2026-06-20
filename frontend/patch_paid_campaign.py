import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/AfterSeminarPaidCampaign.jsx', 'r') as f:
    content = f.read()

# 1. Update fetchPaidCampaignData signature and params
old_fetch = """    const fetchPaidCampaignData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/retention/campaign-data', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness, batchId: filters.selectedBatch }
            });"""

new_fetch = """    const fetchPaidCampaignData = async (targetMonth = null) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/retention/campaign-data', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness, batchId: filters.selectedBatch, targetMonthName: targetMonth || selectedGroupName }
            });"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print("Replaced fetchPaidCampaignData signature")
else:
    print("Could not find fetchPaidCampaignData signature")

# 2. Update the onChange handler for the dropdown
old_onchange = "onChange={(e) => { setSelectedGroupName(e.target.value); setCurrentPage(1); }}"
new_onchange = "onChange={(e) => { setSelectedGroupName(e.target.value); setCurrentPage(1); fetchPaidCampaignData(e.target.value); }}"

if old_onchange in content:
    content = content.replace(old_onchange, new_onchange)
    print("Replaced onChange handler")
else:
    print("Could not find onChange handler")

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/AfterSeminarPaidCampaign.jsx', 'w') as f:
    f.write(content)
