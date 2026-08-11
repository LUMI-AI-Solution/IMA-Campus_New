import os

files = {
    "pages/student/components/EnrollmentTab.jsx": [
        ("bg-white/5 backdrop-blur-xl border border-white/20 shadow-xl rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[3rem]")
    ],
    "pages/student/components/DeliveryHub.jsx": [
        ("bg-[#1e2336]/60 rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-[3rem]"),
        ("bg-[#1e2336]/80 border border-white/20 rounded-3xl", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-[3rem]")
    ],
    "pages/student/components/PaymentHistory.jsx": [
        ("bg-[#1e2336]/60 rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-[3rem]"),
        ("bg-[#1e2336]/80 border border-white/20 rounded-3xl", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-[3rem]"),
        ("bg-[#1e2336]/80 border border-white/20 rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-[3rem]")
    ],
    "pages/student/components/ProfileSettings.jsx": [
        ("bg-[#1e2336]/60 rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-[3rem]"),
        ("bg-[#1e2336]/80 border border-white/20 rounded-[2.5rem]", "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-[3rem]")
    ]
}

for file_path, replacements in files.items():
    full_path = os.path.join("/root/IMA-Campus/frontend/src", file_path)
    if not os.path.exists(full_path): continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Applied gradient glass structure to all tabs.")
