import os

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
        
    # Revert backgrounds to bright frosted glass
    content = content.replace("bg-black/30", "bg-white/30 backdrop-blur-lg")
    content = content.replace("bg-black/40", "bg-white/40 backdrop-blur-xl")
    content = content.replace("bg-black/50", "bg-white/50 backdrop-blur-2xl")
    content = content.replace("bg-white/5", "bg-white/30 backdrop-blur-lg")
    content = content.replace("bg-white/10", "bg-white/40 backdrop-blur-xl")
    
    # Text color changes to Slate-900 for high contrast on light glass
    content = content.replace("text-white/80", "text-slate-700 font-semibold")
    content = content.replace("text-white/90", "text-slate-800 font-bold")
    content = content.replace("text-white/70", "text-slate-600 font-semibold")
    content = content.replace("text-white/60", "text-slate-500 font-semibold")
    content = content.replace("text-white/50", "text-slate-500 font-medium")
    content = content.replace("text-white/40", "text-slate-400 font-medium")
    content = content.replace("text-white/30", "text-slate-400")
    
    # Replace text-white globally, but carefully restore buttons
    content = content.replace("text-white", "text-slate-900")
    
    # Fix buttons and active states
    content = content.replace("bg-red-600 text-slate-900", "bg-red-600 text-white")
    content = content.replace("to-red-800 text-slate-900", "to-red-800 text-white")
    content = content.replace("to-blue-700 p-3 md:p-4 rounded-xl md:rounded-2xl text-slate-900", "to-blue-700 p-3 md:p-4 rounded-xl md:rounded-2xl text-white")
    content = content.replace("bg-blue-500 text-slate-900", "bg-blue-500 text-white")
    content = content.replace("text-slate-900 bg-black/40", "text-white bg-black/40") # Some specific active tags
    content = content.replace("fill-slate-900", "fill-white")
    
    # Border improvements
    content = content.replace("border-white/20", "border-white/60")
    content = content.replace("border-white/10", "border-white/50")

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done applying light theme.")
