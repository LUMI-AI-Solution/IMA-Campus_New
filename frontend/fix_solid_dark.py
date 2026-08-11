import os
import glob

components_dir = '/root/IMA-Campus/frontend/src/pages/student/components'
files = glob.glob(os.path.join(components_dir, '*.jsx'))

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # 1. Main Outer Containers: make them nearly solid dark slate (like the checkout modal, but better for main tabs)
    content = content.replace('bg-[#1a1f2e]/90 backdrop-blur-3xl', 'bg-[#0f172a]/95 backdrop-blur-3xl')
    
    # 2. Inner cards / sections (previously bg-white/10 or bg-black/20)
    # We want them to stand out. Let's make them slightly lighter solid slate
    content = content.replace('bg-white/10 backdrop-blur-xl', 'bg-[#1e293b]/90 backdrop-blur-xl')
    content = content.replace('bg-white/10 backdrop-blur-2xl', 'bg-[#1e293b]/90 backdrop-blur-xl')
    
    # "Personal Information" / "Payment History" / etc.
    content = content.replace('bg-black/20', 'bg-[#1e293b]/80')
    
    # 3. Input fields (previously bg-black/40 or bg-black/50)
    # Make them solid darkest slate
    content = content.replace('bg-black/40', 'bg-[#020617]')
    content = content.replace('bg-black/30', 'bg-[#020617]')
    
    # 4. Borders
    # White borders can look weird on solid dark colors, let's soften them
    content = content.replace('border-white/20', 'border-slate-700/50')
    content = content.replace('border-white/10', 'border-slate-700/30')
    content = content.replace('border-white/30', 'border-slate-600/50')

    with open(file, 'w') as f:
        f.write(content)

print("Applied solid dark UI style successfully!")
