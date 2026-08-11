import os

files_to_fix = [
    "pages/student/components/StudentOverview.jsx",
    "pages/student/components/EnrollmentTab.jsx",
    "pages/student/components/MyClassroom.jsx",
    "pages/student/components/DeliveryHub.jsx",
    "pages/student/components/PaymentHistory.jsx",
    "pages/student/components/ProfileSettings.jsx"
]

replacements = {
    # Revert light backgrounds to dark frosted glass
    "bg-white/5": "bg-black/30",
    "bg-white/10": "bg-black/40",
    "bg-white/10 backdrop-blur-md": "bg-black/50 backdrop-blur-md",
    "bg-white/20": "bg-white/10", # making slightly darker
}

for file_path in files_to_fix:
    full_path = os.path.join("/root/IMA-Campus/frontend/src", file_path)
    if not os.path.exists(full_path):
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done darkening UI.")
