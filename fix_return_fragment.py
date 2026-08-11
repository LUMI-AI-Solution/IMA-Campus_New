import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

newinq = newinq.replace("return (\\n        <div className=\\\"w-full h-full flex flex-col bg-transparent overflow-y-auto custom-scrollbar font-sans text-slate-100\\\">", "return (\\n        <>\\n        <div className=\\\"w-full h-full flex flex-col bg-transparent overflow-y-auto custom-scrollbar font-sans text-slate-100\\\">")

# Need to also replace the final closing parenthesis.
# Let's find the end of the file.
old_end = "            {/* REMINDER MODAL */}"
new_end = "            {/* REMINDER MODAL */}"
# Wait, I'll just append `</>` before the last `);`
# The file ends with `);` and `}; export default AfterSeminarNewInq;`
newinq = re.sub(r'\);(\s*)\};(\s*)export default AfterSeminarNewInq;', r'</>\n    );\1};\2export default AfterSeminarNewInq;', newinq)

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
print("Return fragment added")
