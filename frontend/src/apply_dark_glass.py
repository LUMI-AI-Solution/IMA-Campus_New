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
        
    # Revert to Smoked Glass backgrounds
    content = content.replace("bg-white/30 backdrop-blur-lg", "bg-white/5 backdrop-blur-xl")
    content = content.replace("bg-white/40 backdrop-blur-xl", "bg-white/10 backdrop-blur-xl")
    content = content.replace("bg-white/50 backdrop-blur-2xl", "bg-white/20 backdrop-blur-2xl")
    
    # MyClassroom gradients
    content = content.replace("bg-gradient-to-br from-white/40 to-white/10", "bg-gradient-to-br from-white/10 to-white/5")
    content = content.replace("bg-gradient-to-b from-white/40 to-white/10", "bg-gradient-to-b from-white/10 to-white/5")
    content = content.replace("bg-gradient-to-r from-white/40 to-white/10", "bg-gradient-to-r from-white/10 to-white/5")
    content = content.replace("bg-gradient-to-br from-white/30 to-white/5", "bg-gradient-to-br from-white/5 to-transparent")
    content = content.replace("hover:from-white/50 hover:to-white/20", "hover:from-white/20 hover:to-white/10")
    content = content.replace("bg-gradient-to-br from-white/60 to-white/20", "bg-gradient-to-br from-white/20 to-white/10")
    content = content.replace("bg-gradient-to-r from-white/40 to-white/10", "bg-gradient-to-r from-white/10 to-white/5")
    
    # Text color changes to white for dark glass
    content = content.replace("text-slate-900", "text-white")
    content = content.replace("text-slate-800 font-bold", "text-white/90 font-bold")
    content = content.replace("text-slate-800", "text-white/90")
    
    content = content.replace("text-slate-700 font-semibold", "text-white/80 font-medium")
    content = content.replace("text-slate-700 font-extrabold", "text-white/80 font-bold")
    content = content.replace("text-slate-700", "text-white/80")
    
    content = content.replace("text-slate-600 font-semibold", "text-white/70 font-medium")
    content = content.replace("text-slate-600 font-extrabold", "text-white/70 font-bold")
    content = content.replace("text-slate-600", "text-white/70")
    
    content = content.replace("text-slate-500 font-semibold", "text-white/60 font-medium")
    content = content.replace("text-slate-500 font-medium", "text-white/50")
    content = content.replace("text-slate-500", "text-white/50")
    
    content = content.replace("text-slate-400 font-medium", "text-white/40")
    content = content.replace("text-slate-400", "text-white/40")
    content = content.replace("text-slate-300", "text-white/30")
    
    # Border improvements
    content = content.replace("border-white/60", "border-white/20")
    content = content.replace("border-white/50", "border-white/10")
    content = content.replace("border-white/40", "border-white/10")

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done applying smoked glass theme.")
