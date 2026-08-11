import os
import glob

components_dir = '/root/IMA-Campus/frontend/src/pages/student/components'
files = glob.glob(os.path.join(components_dir, '*.jsx'))
files.append('/root/IMA-Campus/frontend/src/pages/student/StudentDashboardV2.jsx')

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # 1. Fix text opacity for better readability (small text visibility)
    content = content.replace('text-white/30', 'text-white/70')
    content = content.replace('text-white/40', 'text-white/80')
    content = content.replace('text-white/50', 'text-white/80')
    content = content.replace('text-white/60', 'text-white/90')
    
    # 2. Fix container background opacity (sudu gathiya) across ALL components
    # Main large containers
    content = content.replace('bg-white/10 backdrop-blur-3xl', 'bg-black/20 backdrop-blur-3xl')
    content = content.replace('bg-white/10 backdrop-blur-2xl', 'bg-black/20 backdrop-blur-2xl')
    content = content.replace('bg-white/10 backdrop-blur-xl', 'bg-black/20 backdrop-blur-xl')
    
    # Other panels and cards
    content = content.replace('bg-white/20', 'bg-white/10')
    content = content.replace('bg-white/30', 'bg-white/10')
    
    # Input fields in SettingsTab and others
    content = content.replace('bg-white/5 border border-white/10', 'bg-black/20 border border-white/20')
    content = content.replace('bg-white/5', 'bg-black/20')

    with open(file, 'w') as f:
        f.write(content)

print(f"Updated {len(files)} files successfully!")
