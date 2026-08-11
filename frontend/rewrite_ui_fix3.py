with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Skip the improperly inserted lines at the very end
    if line.strip() == '</>' and i > 1870:
        continue
    if line.strip() == ')}' and i > 1870:
        continue
    
    # Insert closing for the conditional render
    if '{/* VERIFICATION ANIMATION OVERLAY' in line:
        new_lines.append("            </>\n        )}\n\n")
    
    new_lines.append(line)

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
    f.writelines(new_lines)
