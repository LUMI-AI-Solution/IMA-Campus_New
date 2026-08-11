import os
import glob

components_dir = '/root/IMA-Campus/frontend/src/pages/student/components'
files = glob.glob(os.path.join(components_dir, '*.jsx'))

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Revert to pure transparent Glassmorphism!
    content = content.replace('bg-[#0f172a]/95 backdrop-blur-3xl', 'bg-white/10 backdrop-blur-3xl')
    content = content.replace('bg-[#1a1f2e]/90 backdrop-blur-3xl', 'bg-white/10 backdrop-blur-3xl')
    
    content = content.replace('bg-[#1e293b]/90 backdrop-blur-xl', 'bg-white/10 backdrop-blur-xl')
    content = content.replace('bg-[#1e293b]/80', 'bg-black/20')
    content = content.replace('bg-[#020617]', 'bg-black/40')
    
    content = content.replace('border-slate-700/50', 'border-white/20')
    content = content.replace('border-slate-700/30', 'border-white/10')
    content = content.replace('border-slate-600/50', 'border-white/30')

    with open(file, 'w') as f:
        f.write(content)

print("Reverted to pure Glass UI successfully!")
