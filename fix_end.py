with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines[-20:]):
    print(len(lines) - 20 + i + 1, line.rstrip())
