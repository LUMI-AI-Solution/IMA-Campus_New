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
    # Replace hardcoded muddy dark backgrounds with clean frosted glass
    "bg-black/20": "bg-white/10",
    "bg-black/30": "bg-white/10",
    "bg-black/40": "bg-white/10",
    "bg-black/50": "bg-white/10 backdrop-blur-md",
    "bg-[#0a0f1c]/80": "bg-white/10 backdrop-blur-md",
    "bg-[#0a0f1c]": "bg-white/5",
    "bg-slate-900": "bg-black/40 backdrop-blur-2xl", # modales should have a darker blur to stand out
    
    # Modal background blur
    "bg-black/90 backdrop-blur-md": "bg-black/50 backdrop-blur-2xl",
    
    # Text contrast improvements (make text more visible)
    "text-white/40": "text-white/70",
    "text-white/50": "text-white/80",
    "text-white/60": "text-white/90",
    "text-slate-500": "text-white/70",
    "text-slate-400": "text-white/80",
    "text-slate-200": "text-white",
    
    # Border improvements
    "border-white/5": "border-white/20",
    "border-white/10": "border-white/20",
    
    # Specific color shifts for better harmony
    "text-gray-400": "text-white/80",
}

for file_path in files_to_fix:
    full_path = os.path.join("/root/IMA-Campus/frontend/src", file_path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done fixing UI.")
