import os
import re

files_to_fix = [
    "pages/student/components/StudentOverview.jsx",
    "pages/student/components/EnrollmentTab.jsx",
    "pages/student/components/MyClassroom.jsx",
    "pages/student/components/DeliveryHub.jsx",
    "pages/student/components/PaymentHistory.jsx",
    "pages/student/components/ProfileSettings.jsx"
]

for file_path in files_to_fix:
    full_path = os.path.join("/root/IMA-Campus/frontend/src", file_path)
    if not os.path.exists(full_path):
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Clean up stacked backdrop-blurs
    content = content.replace("backdrop-blur-xl0 backdrop-blur-2xl backdrop-blur-2xl", "backdrop-blur-2xl")
    content = content.replace("backdrop-blur-xl backdrop-blur-2xl", "backdrop-blur-2xl")
    content = content.replace("backdrop-blur-md backdrop-blur-xl", "backdrop-blur-xl")
    content = content.replace("backdrop-blur-xl backdrop-blur-xl", "backdrop-blur-xl")
    content = content.replace("backdrop-blur-xl backdrop-blur-md", "backdrop-blur-xl")
    content = content.replace("backdrop-blur-lg backdrop-blur-xl", "backdrop-blur-xl")
    
    # Fix double text-whites and double fonts
    content = content.replace("font-bold font-medium", "font-bold")
    content = content.replace("font-extrabold font-bold", "font-extrabold")
    content = content.replace("text-white/80 font-medium font-medium", "text-white/80 font-medium")
    content = content.replace("text-white/90 font-bold font-bold", "text-white/90 font-bold")
    
    # Apply modern structural classes to outer containers
    content = content.replace("rounded-[2rem]", "rounded-[2.5rem]")
    content = content.replace("glass-card rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[3rem]")

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done cleaning up classes.")
