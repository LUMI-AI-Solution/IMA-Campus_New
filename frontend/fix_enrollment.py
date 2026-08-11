with open('/root/IMA-Campus/frontend/src/pages/student/components/EnrollmentTab.jsx', 'r') as f:
    content = f.read()

# 1. Remove flex flex-col from modal container
content = content.replace(
    'className="m-auto bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 md:p-8 w-full max-w-lg relative shadow-2xl flex flex-col"',
    'className="m-auto bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 md:p-8 w-full max-w-lg relative shadow-2xl"'
)

# 2. Remove shrink-0 from header
content = content.replace(
    'className="text-white/80 font-medium hover:text-white bg-white/10 backdrop-blur-xl p-2 rounded-xl shrink-0"',
    'className="text-white/80 font-medium hover:text-white bg-white/10 backdrop-blur-xl p-2 rounded-xl"'
)

# 3. Remove shrink-0 from amount box
content = content.replace(
    'className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center mb-6 shadow-inner shrink-0"',
    'className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center mb-6 shadow-inner"'
)

# 4. Remove shrink-0 from tabs
content = content.replace(
    'className="flex gap-2 bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/20 mb-6 shrink-0"',
    'className="flex gap-2 bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/20 mb-6"'
)

# 5. Remove flex-1 overflow-y-auto from middle container
content = content.replace(
    'className="flex-1 overflow-y-auto pr-1 mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"',
    'className="mb-4"'
)

# 6. Remove shrink-0 and w-full mt-2 from submit button and replace with block flow mt-4
content = content.replace(
    'className="w-full shrink-0 bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3.5 rounded-xl transition-colors hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-xs uppercase tracking-widest border border-red-500/50 shadow-lg mt-2"',
    'className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3.5 rounded-xl transition-colors hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-xs uppercase tracking-widest border border-red-500/50 shadow-lg"'
)

with open('/root/IMA-Campus/frontend/src/pages/student/components/EnrollmentTab.jsx', 'w') as f:
    f.write(content)
