import os
import glob

components_dir = '/root/IMA-Campus/frontend/src/pages/student/components'
files = glob.glob(os.path.join(components_dir, '*.jsx'))

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Change main container backgrounds from bg-black/20 or bg-white/10 to the checkout style
    content = content.replace('bg-black/20 backdrop-blur-3xl', 'bg-[#1a1f2e]/90 backdrop-blur-3xl')
    content = content.replace('bg-white/10 backdrop-blur-3xl', 'bg-[#1a1f2e]/90 backdrop-blur-3xl')
    
    # Also for Slip Instructions modal in EnrollmentTab.jsx
    content = content.replace('bg-black/20 backdrop-blur-2xl border border-white/20 p-5 md:p-8 rounded-3xl max-w-2xl', 'bg-[#1a1f2e]/95 backdrop-blur-3xl border border-white/10 p-5 md:p-8 rounded-[2rem] max-w-2xl')
    content = content.replace('bg-black/95 animate-in', 'bg-black/60 backdrop-blur-md animate-in')

    # Change settings input boxes from bg-black/20 or bg-white/5 to bg-black/40 (like the checkout inputs/boxes)
    # Be careful not to replace the inner boxes that are already bg-black/20 if they look fine.
    # Actually, in Settings, they are bg-black/20 border border-white/20. Let's make them bg-[#0f172a]/60
    content = content.replace('bg-black/20 border border-white/20 w-full', 'bg-black/40 border border-white/10 w-full')

    with open(file, 'w') as f:
        f.write(content)

print("Applied checkout UI style successfully!")
