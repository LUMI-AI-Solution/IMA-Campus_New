import sys
with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    lines = f.readlines()

with open('scratch_ui.jsx', 'r') as f:
    new_ui = f.read()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "{/* VERIFICATION ANIMATION OVERLAY" in line:
        start_idx = i
    if "{/* NEW MONTH MODAL */}" in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
        for j in range(start_idx):
            f.write(lines[j])
        
        f.write("      " + new_ui + "\n")
        
        for j in range(end_idx, len(lines)):
            f.write(lines[j])
    print("Replaced successfully")
else:
    print("Could not find boundaries")
