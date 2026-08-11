import re

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'r') as f:
    newinq = f.read()

old_name_section = """                                                    <div>
                                                        <h3 className="text-lg font-black text-white leading-tight tracking-wide">{lead.phone?.split('_')[0]}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-slate-400 text-[10px] font-bold uppercase truncate max-w-[120px]">~ {lead.name || 'Unknown'}</p>
                                                            {timerData && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border ${timerData.isLate ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                                    {timerData.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>"""

new_name_section = """                                                    <div>
                                                        <h3 className="text-lg font-black text-white leading-tight tracking-wide flex items-center gap-1.5 flex-wrap">
                                                            {lead.phone?.split('_')[0]}
                                                            {timerData && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border ${timerData.isLate ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                                    {timerData.text}
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            <p className="text-slate-400 text-[10px] font-bold uppercase truncate max-w-[150px]">WA: {lead.name || 'Unknown'}</p>
                                                            {lead.registeredUser && (
                                                                <p 
                                                                    className="text-emerald-400 text-[10px] font-bold uppercase leading-tight w-full break-words hover:underline" 
                                                                    title="Registered on Web"
                                                                >
                                                                    WEB: {lead.registeredUser.firstName} {lead.registeredUser.lastName}
                                                                </p>
                                                            )}
                                                            {lead.registeredUser?.optionalPhone && (
                                                                <p className="text-amber-400 text-[10px] font-bold uppercase truncate w-full">OP: {lead.registeredUser.optionalPhone}</p>
                                                            )}
                                                            {(enrollmentValue === 'ENROLLED' || enrollmentValue === 'ENROLLED_INSTALLMENT') && lead.enrolledSubjects && lead.enrolledSubjects.length > 0 && (
                                                                <p className="text-purple-400 text-[10px] font-bold uppercase truncate w-full" title={lead.enrolledSubjects.join(', ')}>SUB: {lead.enrolledSubjects[0]} {lead.enrolledSubjects.length > 1 ? `+${lead.enrolledSubjects.length - 1}` : ''}</p>
                                                            )}
                                                        </div>
                                                    </div>"""

if old_name_section in newinq:
    newinq = newinq.replace(old_name_section, new_name_section)
    print("Patched successfully")
else:
    print("Could not find name section")

with open('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'w') as f:
    f.write(newinq)
