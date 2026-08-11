import os
import glob

files = [
    '/root/IMA-Campus/frontend/src/pages/student/components/StudentOverview.jsx',
    '/root/IMA-Campus/frontend/src/pages/student/components/MyClassroom.jsx',
    '/root/IMA-Campus/frontend/src/pages/student/components/SidebarV2.jsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Darken backgrounds for better contrast with white text
    # We'll use bg-black/20 instead of bg-white/10 for main cards
    # and bg-white/5 instead of bg-white/10 for small badges
    content = content.replace('bg-white/30', 'bg-white/10')
    content = content.replace('bg-white/20', 'bg-white/10')
    
    # For large containers that had bg-white/10 backdrop-blur-3xl, make them darker
    content = content.replace('bg-white/10 backdrop-blur-3xl', 'bg-black/20 backdrop-blur-3xl')
    content = content.replace('bg-white/10 backdrop-blur-2xl', 'bg-black/20 backdrop-blur-2xl')
    content = content.replace('bg-white/10 backdrop-blur-xl', 'bg-black/20 backdrop-blur-xl')
    
    # Specific fix for "Already Paid" tags etc
    content = content.replace('bg-white/40', 'bg-white/10')
    content = content.replace('bg-white/50', 'bg-white/10')

    with open(file, 'w') as f:
        f.write(content)
        
print("Updated successfully!")
