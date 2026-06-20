import re

with open('src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/CampaignHeader.jsx', 'r') as f:
    content = f.read()

content = content.replace("selectedGroupId", "selectedGroupName")
content = content.replace("setSelectedGroupId", "setSelectedGroupName")

select_block = """                        <select 
                            value={selectedGroupName || ''} 
                            onChange={(e) => setSelectedGroupName(e.target.value)} 
                            className="bg-transparent border-none text-slate-200 text-sm font-bold rounded-lg px-4 py-2 outline-none cursor-pointer w-full md:w-auto appearance-none pr-8 relative"
                            style={{
                                backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '18px'
                            }}
                        >
                            {monthlyGroups.map((group, idx) => (
                                <option key={idx} value={group.name} className="bg-slate-900 text-slate-200">
                                    📅 {group.name}
                                </option>
                            ))}
                        </select>"""

content = re.sub(
    r"<select\s+value=\{selectedGroupName \|\| ''\}\s+onChange=\{\(e\) => setSelectedGroupName\(parseInt\(e\.target\.value\)\)\}.*?</select>",
    select_block,
    content,
    flags=re.DOTALL
)

with open('src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/CampaignHeader.jsx', 'w') as f:
    f.write(content)
