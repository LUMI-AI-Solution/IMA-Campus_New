with open('/root/IMA-Campus/frontend/src/pages/student/components/EnrollmentTab.jsx', 'r') as f:
    content = f.read()

# Replace the modal container wrapper
content = content.replace(
    'className="fixed inset-0 z-[99999] flex p-4 md:p-8 overflow-y-auto bg-white/5 backdrop-blur-2xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"',
    'className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md"'
)

# Replace the modal body
content = content.replace(
    'className="m-auto bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 md:p-8 w-full max-w-lg relative shadow-2xl"',
    'className="bg-[#1a1f2e]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-lg relative shadow-2xl overflow-y-auto max-h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"'
)

# Replace the dashed box
old_box = '''<div className="border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-xl rounded-[1.5rem] p-8 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer mb-4 group relative" onClick={openSlipInstructions}>'''
new_box = '''<div className="w-full min-h-[160px] flex flex-col justify-center items-center border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-xl rounded-[1.5rem] p-6 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer mb-4 relative overflow-hidden" onClick={openSlipInstructions}>'''
content = content.replace(old_box, new_box)

# Also fix the flex gap-2 line to make it more bulletproof
content = content.replace(
    'className="flex gap-2 bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/20 mb-6"',
    'className="flex flex-wrap gap-2 bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/20 mb-6"'
)

with open('/root/IMA-Campus/frontend/src/pages/student/components/EnrollmentTab.jsx', 'w') as f:
    f.write(content)
