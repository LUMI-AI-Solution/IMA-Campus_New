import React from 'react';
import { FolderOpen, Layers, BookOpen, Edit3, Trash2, ChevronRight, ChevronDown, GripVertical, CheckCircle, Video, MonitorPlay, FileText, FileSignature, Power, UserPlus, Plus, Users, User, Eye, EyeOff, Calendar, TrendingUp } from 'lucide-react';
import api from '../../../api/axios'; 
import UpgradePricingConfig from '../../admin/UpgradePricingConfig'; 

export default function ContentHubViews({ state, actions }) {
    const {
        isSystemAdmin, canManageBatches, canManageGroupsAndSubjects, canManageContent,
        viewLevel, activeBusiness, activeBatch, batchTab, activeSubject, contentTab, businesses, batches, uniqueSubjects,
        lessonGroups, subjectContents, editMode, openFolders, groupedSubjects
    } = state;

    const {
        openBusinessDetails, openBatchDetails, openContentsView, getImageUrl, getManagerName, toggleBusinessStatus, toggleBatchStatus, deleteItem,
        setEditData, setEditMode, setSelectedLogoName, setShowBusinessModal, setShowAssignModal, setShowBatchModal, setShowGroupModal, setShowCourseModal,
        setShowLessonGroupModal, setShowContentModal, setPreviewData, setContentType, setPrefilledFolder, setSelectedBatchesForContent,
        toggleFolder, setBatchTab, setContentTab, isMatchedType, getFolderId, setDiscountRules, setSelectedGroupPrices, setMassAssignSubjects
    } = actions;

    const getBaseUrl = () => {
        let url = api.defaults.baseURL || 'https://imacampus.online/api';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    return (
        <div className="w-full space-y-8 relative z-10">
            
            {/* BUSINESSES VIEW */}
            {viewLevel === 'businesses' && isSystemAdmin && (
                businesses?.length === 0 ? <p className="text-center text-gray-400 py-16 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-sm text-lg font-bold">No businesses created yet.</p> : 
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {businesses?.map((biz) => (
                    <div key={biz.id} className="group bg-white/[0.05] backdrop-blur-2xl hover:border-brand-accent/50 border border-white/10 p-6 md:p-8 rounded-[2rem] flex flex-col gap-6 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-lg relative overflow-hidden">
                        
                        {/* Glow Effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none rounded-full bg-brand-accent transition-opacity group-hover:opacity-40"></div>

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-20 h-20 bg-black/20 rounded-2xl flex items-center justify-center p-3 border border-white/10 transition-colors shrink-0 shadow-inner">
                                <img src={getImageUrl(biz.logo)} onError={(e) => { e.target.src = '/logo.png'; }} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-md" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className="text-2xl font-extrabold text-white mb-2 truncate drop-shadow-sm" title={biz.name}>{biz.name}</h3>
                                <span className="text-[11px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 inline-block truncate max-w-full shadow-sm">{biz.category}</span>
                            </div>
                        </div>
                        
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3 text-sm relative z-10 shadow-inner">
                            <div className="flex justify-between items-center"><span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Head Manager</span> <span className="text-white font-extrabold truncate pl-2">{getManagerName(biz.head_manager_id)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Asst Manager</span> <span className="text-white font-extrabold truncate pl-2">{getManagerName(biz.ass_manager_id)}</span></div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-auto relative z-10">
                            <button onClick={() => { setEditData(biz); setShowAssignModal(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors border border-white/10 outline-none shadow-sm" title="Assign Managers"><UserPlus size={18}/></button>
                            <button onClick={() => { setEditData(biz); setEditMode(true); setSelectedLogoName(""); setShowBusinessModal(true); }} className="text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white p-3.5 rounded-xl transition-colors border border-transparent hover:border-blue-500/50 outline-none shadow-sm" title="Edit Business"><Edit3 size={20}/></button>
                            <button onClick={() => toggleBusinessStatus(biz)} className={`p-3.5 rounded-xl border transition-colors outline-none shadow-sm ${biz.status === 1 ? 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500 hover:text-white' : 'text-gray-400 bg-white/5 border-white/10 hover:bg-white/20 hover:text-white'}`} title={biz.status === 1 ? "Hide from Students" : "Show to Students"}>{biz.status === 1 ? <Eye size={20}/> : <EyeOff size={20}/>}</button>
                            <button onClick={() => deleteItem('/admin/business/delete', { business_id: biz.id }, "Business Deleted")} className="text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white p-3.5 rounded-xl border border-transparent hover:border-red-500/50 transition-colors outline-none shadow-sm" title="Delete Business"><Trash2 size={20}/></button>
                        </div>
                        <button onClick={() => openBusinessDetails(biz)} className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white py-4 rounded-xl text-sm md:text-base font-extrabold flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-1 outline-none relative z-10 uppercase tracking-wide border border-transparent">Manage Batches <ChevronRight size={18}/></button>
                    </div>
                ))}
                </div>
            )}

            {/* BATCHES VIEW */}
            {viewLevel === 'batches' && (
                batches?.length === 0 ? <p className="text-center text-gray-400 py-16 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-sm text-lg font-bold">No batches available yet.</p> : 
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {batches?.map((batch) => (
                    <div key={batch.id} className="group bg-white/[0.05] backdrop-blur-2xl hover:border-brand-accent/50 border border-white/10 p-6 md:p-8 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-lg relative overflow-hidden">
                        
                        <div className="absolute top-0 left-0 w-3 h-full bg-brand-accent opacity-80"></div>

                        <div className="flex items-center gap-5 overflow-hidden w-full sm:w-auto pl-2 relative z-10">
                            <div className="w-16 h-16 bg-black/20 rounded-2xl flex items-center justify-center p-3 border border-white/10 transition-colors shrink-0 shadow-inner">
                                <img src={getImageUrl(batch.logo || activeBusiness?.logo)} onError={(e) => { e.target.src = '/logo.png'; }} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-md" />
                            </div>
                            <div className="flex-1 overflow-hidden pr-2">
                                <h3 className="text-xl font-extrabold text-white mb-2 truncate drop-shadow-sm" title={batch.name}>{batch.name}</h3>
                                <p className="text-[11px] text-brand-accent font-black uppercase tracking-widest bg-brand-accent/10 border border-brand-accent/20 px-3 py-1.5 rounded-md inline-block truncate max-w-full shadow-sm">{batch.groups?.length || 0} Groups Assigned</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 shrink-0 relative z-10">
                            {canManageBatches && (
                                <>
                                    <button onClick={() => toggleBatchStatus(batch)} className={`p-3.5 rounded-xl border transition-colors outline-none shadow-sm ${batch.status === 1 ? 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500 hover:text-white' : 'text-gray-400 bg-white/5 border-white/10 hover:bg-white/20 hover:text-white'}`} title={batch.status === 1 ? "Hide from Students" : "Show to Students"}>{batch.status === 1 ? <Eye size={20}/> : <EyeOff size={20}/>}</button>
                                    <button onClick={() => { setEditData(batch); setEditMode(true); setSelectedLogoName(""); setShowBatchModal(true); }} className="text-blue-400 bg-blue-500/10 border border-transparent hover:border-blue-500/50 hover:bg-blue-500 hover:text-white p-3.5 rounded-xl transition-colors outline-none shadow-sm"><Edit3 size={20}/></button>
                                    <button onClick={() => deleteItem('/admin/batch/delete', { batch_id: batch.id }, "Batch Deleted")} className="text-red-400 bg-red-500/10 border border-transparent hover:border-red-500/50 hover:bg-red-500 hover:text-white p-3.5 rounded-xl transition-colors outline-none shadow-sm"><Trash2 size={20}/></button>
                                </>
                            )}
                            <button onClick={() => openBatchDetails(batch)} className="flex-1 sm:flex-none bg-brand-accent/90 hover:bg-brand-accent text-white px-6 py-3.5 rounded-xl text-sm font-extrabold flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] sm:ml-2 shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none uppercase tracking-wide border border-transparent">Manage <ChevronRight size={18}/></button>
                        </div>
                    </div>
                ))}
                </div>
            )}

            {/* BATCH DETAILS VIEW */}
            {viewLevel === 'batch_details' && (
                <div className="flex flex-col h-full animate-fade-in relative z-10">
                    
                    {/* TABS */}
                    <div className="flex flex-wrap gap-2 md:gap-3 mb-8 bg-white/[0.05] backdrop-blur-2xl p-2.5 rounded-[1.5rem] w-full md:w-max border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                        <button onClick={() => setBatchTab('groups')} className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wide flex items-center gap-2 transition-all outline-none border border-transparent ${batchTab === 'groups' ? 'bg-brand-accent/90 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}><Layers size={18} className="hidden sm:block"/> Groups</button>
                        <button onClick={() => setBatchTab('subjects')} className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wide flex items-center gap-2 transition-all outline-none border border-transparent ${batchTab === 'subjects' ? 'bg-brand-accent/90 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}><BookOpen size={18} className="hidden sm:block"/> Subjects</button>
                        <button onClick={() => setBatchTab('lecturers')} className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wide flex items-center gap-2 transition-all outline-none border border-transparent ${batchTab === 'lecturers' ? 'bg-brand-accent/90 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}><Users size={18} className="hidden sm:block"/> Lecturers</button>
                        <button onClick={() => setBatchTab('upgrade-pricing')} className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wide flex items-center gap-2 transition-all outline-none border border-transparent ${batchTab === 'upgrade-pricing' ? 'bg-brand-accent/90 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}><TrendingUp size={18} className="hidden sm:block"/> Upgrade Prices</button>
                    </div>

                    <div className="space-y-6">
                        
                        {/* GROUPS TAB */}
                        {batchTab === 'groups' && (
                            activeBatch?.groups?.length === 0 ? <p className="text-center text-gray-400 py-16 bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-sm text-lg font-bold">No payment groups created yet.</p> :
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {activeBatch?.groups?.map((group) => (
                                <div key={group.id} className="bg-white/[0.05] backdrop-blur-2xl hover:border-brand-accent/40 border border-white/10 p-6 md:p-8 rounded-[2rem] flex flex-col justify-between gap-6 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-lg relative overflow-hidden">
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="overflow-hidden pr-4">
                                            <h3 className="text-xl font-extrabold text-white mb-3 truncate drop-shadow-sm" title={group.name}>{group.name}</h3>
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 shadow-sm">{group.type === 1 ? 'Monthly Payment' : 'Full Payment'}</span>
                                        </div>
                                        {canManageGroupsAndSubjects && (
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => { setEditData(group); setEditMode(true); setDiscountRules(group.discount_rules ? JSON.parse(group.discount_rules) : []); setShowGroupModal(true); }} className="text-blue-400 bg-blue-500/10 border border-transparent hover:border-blue-500/50 hover:bg-blue-500 hover:text-white p-3 rounded-xl transition-colors outline-none shadow-sm"><Edit3 size={20}/></button>
                                                <button onClick={() => deleteItem('/course-setup/group', { group_id: group.id }, "Group Deleted")} className="text-red-400 bg-red-500/10 border border-transparent hover:border-red-500/50 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors outline-none shadow-sm"><Trash2 size={20}/></button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {group.type !== 1 && group.discount_rules && JSON.parse(group.discount_rules).length > 0 && (
                                        <div className="flex flex-wrap gap-3 pt-5 border-t border-white/10 relative z-10">
                                            {JSON.parse(group.discount_rules).map((rule, ridx) => (
                                                <span key={ridx} className="text-[11px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 px-4 py-2 rounded-xl border border-orange-500/20 shadow-sm">Buy {rule.courseCount} @ Rs {rule.pricePerCourse}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        )}

                        {/* LECTURERS TAB */}
                        {batchTab === 'lecturers' && (
                            (!activeBatch?.lecturers || JSON.parse(activeBatch.lecturers).length === 0) ? <p className="text-center text-gray-400 py-16 bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-sm text-lg font-bold">No lecturers added for this batch.</p> : 
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {JSON.parse(activeBatch.lecturers).map((lecturer, idx) => (
                                    <div key={idx} className="bg-white/[0.05] backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-[2rem] flex flex-col justify-between gap-5 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-lg">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-brand-accent/20 rounded-full flex items-center justify-center text-brand-accent font-black text-2xl border border-brand-accent/30 shrink-0 shadow-sm">
                                                {lecturer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="text-xl font-extrabold text-white truncate mb-1 drop-shadow-sm" title={lecturer.name}>{lecturer.name}</h3>
                                                <p className="text-sm font-bold text-gray-400">{lecturer.phone || 'No Phone'}</p>
                                            </div>
                                        </div>
                                        {canManageGroupsAndSubjects && (
                                            <div className="flex gap-2 justify-end mt-2 pt-5 border-t border-white/10">
                                                <button onClick={() => { setEditData({ ...lecturer, index: idx }); setEditMode(true); actions.setShowLecturerModal(true); }} className="text-blue-400 bg-blue-500/10 border border-transparent hover:border-blue-500/50 hover:bg-blue-500 hover:text-white p-2.5 rounded-xl transition-colors outline-none shadow-sm"><Edit3 size={18}/></button>
                                                <button onClick={() => actions.handleDeleteLecturer(idx)} className="text-red-400 bg-red-500/10 border border-transparent hover:border-red-500/50 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors outline-none shadow-sm"><Trash2 size={18}/></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* SUBJECTS TAB */}
                        {batchTab === 'subjects' && (
                            Object.keys(groupedSubjects).length === 0 ? <p className="text-center text-gray-400 py-16 bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-sm text-lg font-bold">No subjects created yet.</p> : 
                            <div className="space-y-8">
                                {Object.keys(groupedSubjects).map((streamName, idx) => (
                                    <div key={idx} className="bg-black/20 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                        {(activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') && (
                                            <h3 className="text-lg font-extrabold text-brand-accent mb-6 flex items-center gap-3 uppercase tracking-widest drop-shadow-sm"><Layers size={24}/> {streamName} Stream</h3>
                                        )}
                                        <div className="grid grid-cols-1 gap-5">
                                            {groupedSubjects[streamName].map((sub) => {
                                                let courseImage = null;
                                                try { if (sub.groupPrices && sub.groupPrices.length > 0 && sub.groupPrices[0].lecturerImage) { courseImage = sub.groupPrices[0].lecturerImage; } } catch(e) {}

                                                return (
                                                <div key={sub.id} className="bg-white/[0.05] hover:border-brand-accent/40 border border-white/10 p-6 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 transition-all shadow-sm hover:shadow-md overflow-hidden group backdrop-blur-md">
                                                    
                                                    <div className="flex items-center gap-4 w-full xl:w-auto overflow-hidden">
                                                        {canManageGroupsAndSubjects && <div className="cursor-move text-slate-600 group-hover:text-brand-accent transition-colors shrink-0 hidden sm:block"><GripVertical size={24}/></div>}
                                                        
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full">
                                                            {courseImage ? (
                                                                <img src={getImageUrl(courseImage)} alt="Lecturer" className="w-16 h-16 rounded-full object-cover border-2 border-white/10 shrink-0 shadow-sm" />
                                                            ) : (
                                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0 shadow-sm">
                                                                    <User size={28} className="text-slate-500" />
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col overflow-hidden w-full">
                                                                <div className="flex flex-wrap items-center gap-3 mb-1">
                                                                    <h3 className="text-lg font-extrabold text-white truncate max-w-full xl:max-w-[400px] drop-shadow-sm" title={sub.name}>{sub.name}</h3>
                                                                    {sub.code && <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-md border border-brand-accent/20 shrink-0 w-max shadow-sm">{sub.code}</span>}
                                                                </div>
                                                                {sub.lecturerName && <span className="text-sm font-bold text-gray-400 mb-1">{sub.lecturerName}</span>}
                                                                
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {sub.activeMonths && (
                                                                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                                                            <Calendar size={12} className="text-emerald-400 shrink-0" />
                                                                            Active: {sub.activeMonths} {sub.activeMonths === 1 ? 'Month' : 'Months'}
                                                                            {sub.startMonth && sub.endMonth && (
                                                                                <span className="text-slate-400 lowercase font-extrabold"> ({sub.startMonth} - {sub.endMonth})</span>
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {sub.groupPrices.map((gp, i) => (
                                                                        <span key={i} className="text-[11px] font-bold text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 whitespace-nowrap shadow-sm backdrop-blur-sm">
                                                                            {gp.groupName}: <span className="text-brand-accent font-black">Rs {gp.price}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full xl:w-auto justify-end mt-4 xl:mt-0 shrink-0 border-t xl:border-none border-white/5 pt-5 xl:pt-0">
                                                        <button onClick={() => openContentsView(sub)} className="flex-1 sm:flex-none bg-green-600/90 hover:bg-green-500 text-white px-6 py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wide flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] shadow-[0_4px_15px_rgba(22,163,74,0.4)] border border-transparent outline-none"><MonitorPlay size={18}/> Manage Content</button>
                                                        {canManageGroupsAndSubjects && (
                                                            <>
                                                                <button onClick={() => { 
                                                                    setEditData(sub); setEditMode(true); 
                                                                    const gPrices = {}; 
                                                                    sub.groupPrices.forEach(p => {
                                                                        gPrices[p.groupId] = { 
                                                                            price: p.price, deliverTute: p.deliverTute === true || p.deliverTute === 'true', 
                                                                            tuteName: p.tuteName || '', tuteCover: p.tuteCover || null, tuteFile: null 
                                                                        };
                                                                    }); 
                                                                    setSelectedGroupPrices(gPrices); setShowCourseModal(true); 
                                                                }} className="text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-transparent hover:border-blue-500/50 p-3.5 rounded-xl transition-colors outline-none shadow-sm"><Edit3 size={18}/></button>
                                                                <button onClick={() => deleteItem('/admin/course/delete', { course_id: sub.id }, "Subject Deleted")} className="text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white border border-transparent hover:border-red-500/50 p-3.5 rounded-xl transition-colors outline-none shadow-sm"><Trash2 size={18}/></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                )})}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* UPGRADE PRICING TAB */}
                        {batchTab === 'upgrade-pricing' && (
                            <UpgradePricingConfig activeBatch={activeBatch} uniqueSubjects={uniqueSubjects} />
                        )}
                    </div>
                </div>
            )}

            {/* CONTENTS VIEW */}
            {viewLevel === 'contents' && (
                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2rem] flex flex-col min-h-[600px] overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] relative z-10">
                    
                    {/* Content Tabs Header */}
                    <div className="flex overflow-x-auto custom-scrollbar border-b border-white/10 bg-black/20 p-4 gap-3">
                        {[ { id: 'live', label: 'Live Classes', icon: Video }, { id: 'recording', label: 'Recordings', icon: MonitorPlay },
                           { id: 'document', label: 'Documents', icon: FileText }, { id: 'sPaper', label: 'Structured', icon: FileSignature }, { id: 'paper', label: 'MCQs', icon: CheckCircle }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setContentTab(tab.id)} className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-extrabold transition-all whitespace-nowrap uppercase tracking-wider outline-none border border-transparent ${contentTab === tab.id ? 'bg-brand-accent/90 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/10'}`}>
                                <tab.icon size={18}/> {tab.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="p-6 md:p-8 space-y-10 overflow-y-auto custom-scrollbar">
                        
                        {/* ORGANIZED FOLDERS */}
                        {lessonGroups.filter(isMatchedType).length > 0 && (
                            <div className="space-y-6">
                                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pl-2 drop-shadow-sm">Organized Folders</h4>
                                
                                {lessonGroups.filter(isMatchedType).map((folder) => (
                                    <div key={folder.id} className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                        <div className="flex flex-wrap justify-between items-center cursor-pointer p-6 bg-white/[0.05] hover:bg-white/10 transition-colors gap-4" onClick={() => toggleFolder(folder.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl transition-colors shadow-sm ${openFolders[folder.id] ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                                                    <FolderOpen size={24}/>
                                                </div>
                                                <h4 className={`text-lg font-extrabold transition-colors truncate max-w-[150px] md:max-w-[400px] drop-shadow-sm ${openFolders[folder.id] ? 'text-brand-accent' : 'text-slate-200'}`} title={folder.title || folder.name}>{folder.title || folder.name}</h4>
                                                <ChevronDown size={20} className={`text-gray-400 transition-transform ${openFolders[folder.id] ? 'rotate-180 text-brand-accent' : ''}`}/>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {canManageContent && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); setContentType(contentTab); setPrefilledFolder(folder.id); setSelectedBatchesForContent([activeBatch.id]); setShowContentModal(true); setEditMode(false); }} className="bg-green-600/90 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 transition-colors shadow-[0_4px_15px_rgba(22,163,74,0.4)] mr-2 border border-transparent outline-none"><Plus size={16}/> Add Content</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setEditData(folder); setEditMode(true); setShowLessonGroupModal(true); }} className="text-blue-400 hover:bg-blue-500 hover:text-white bg-blue-500/10 border border-transparent hover:border-blue-500/50 p-2.5 rounded-xl transition-colors outline-none shadow-sm"><Edit3 size={18}/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); deleteItem('/admin/content-group/delete', { contentGroupId: folder.id }, "Folder Deleted"); }} className="text-red-400 hover:bg-red-500 hover:text-white bg-red-500/10 border border-transparent hover:border-red-500/50 p-2.5 rounded-xl transition-colors outline-none shadow-sm"><Trash2 size={18}/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {openFolders[folder.id] && (
                                          <div className="border-t border-white/10 bg-black/20 p-6 md:p-8 shadow-inner">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                  {subjectContents
                                                      .filter(c => isMatchedType(c) && getFolderId(c) === String(folder.id))
                                                      .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1))
                                                      .map((content) => (
                                                        <div key={content.id} className="bg-white/[0.05] border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/30 transition-all shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] group flex flex-col relative backdrop-blur-md">
                                                            
                                                            {/* Drag handle */}
                                                            {canManageContent && (
                                                                <div className="absolute top-3 left-3 z-10 bg-black/50 p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shadow-sm border border-white/10">
                                                                    <GripVertical size={16} className="text-white"/>
                                                                </div>
                                                            )}

                                                            {/* Thumbnail Image Section */}
                                                            <div className="h-40 w-full bg-black/40 relative overflow-hidden shrink-0 border-b border-white/5">
                                                                {content.thumbnail ? (
                                                                    <img src={`${getBaseUrl()}/storage/documents/${content.thumbnail}`} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-slate-800/50 to-black flex items-center justify-center opacity-80 group-hover:scale-105 transition-transform duration-500">
                                                                        <MonitorPlay size={40} className="text-white/20" />
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Date Badge */}
                                                                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                                                                    {content.date ? content.date.split('T')[0] : 'No Date'}
                                                                </div>
                                                            </div>

                                                            {/* Content Details */}
                                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                                <h4 className="text-base font-extrabold text-white mb-4 line-clamp-2 leading-snug group-hover:text-brand-accent transition-colors drop-shadow-sm" title={content.title}>
                                                                    {content.title}
                                                                </h4>
                                                                
                                                                {/* Action Buttons */}
                                                                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                                                                    <button onClick={() => {
                                                                        let fileUrl = content.fileName ? `${getBaseUrl()}/storage/documents/${content.fileName}` : content.link;
                                                                        setPreviewData({ ...content, link: fileUrl });
                                                                    }} className="flex-1 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm outline-none">
                                                                        PREVIEW
                                                                    </button>
                                                                    
                                                                    {canManageContent && (
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => { 
                                                                                setEditData(content); setEditMode(true); setShowContentModal(true); setContentType(contentTab); 
                                                                                if(content.assignedCourses && content.assignedCourses.length > 0) { setMassAssignSubjects(content.assignedCourses); } 
                                                                                else { setMassAssignSubjects([activeSubject.id]); }
                                                                                setSelectedBatchesForContent([activeBatch.id]);
                                                                            }} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white p-2.5 rounded-xl transition-colors shadow-sm outline-none">
                                                                                <Edit3 size={18}/>
                                                                            </button>
                                                                            <button onClick={() => deleteItem('/admin/content/delete', { content_id: content.id }, "Content Deleted")} className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors shadow-sm outline-none">
                                                                                <Trash2 size={18}/>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                      ))}
                                              </div>
                                              
                                              {subjectContents.filter(c => isMatchedType(c) && getFolderId(c) === String(folder.id)).length === 0 && <p className="text-sm text-gray-400 py-8 text-center font-bold bg-white/5 rounded-2xl border border-white/10 shadow-inner">This folder is empty.</p>}
                                          </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* UNCATEGORIZED ITEMS */}
                        <div className="mt-12">
                            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 pl-2 drop-shadow-sm">Uncategorized Items</h4>
                            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {subjectContents
                                        .filter(c => isMatchedType(c) && !getFolderId(c))
                                        .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1))
                                        .map((content) => (
                                        <div key={content.id} className="bg-white/[0.05] border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/30 transition-all shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] group flex flex-col relative backdrop-blur-md">
                                            
                                            {/* Drag handle */}
                                            {canManageContent && (
                                                <div className="absolute top-3 left-3 z-10 bg-black/50 p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shadow-sm border border-white/10">
                                                    <GripVertical size={16} className="text-white"/>
                                                </div>
                                            )}

                                            {/* Thumbnail Image Section */}
                                            <div className="h-40 w-full bg-black/40 relative overflow-hidden shrink-0 border-b border-white/5">
                                                {content.thumbnail ? (
                                                    <img src={`${getBaseUrl()}/storage/documents/${content.thumbnail}`} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-800/50 to-black flex items-center justify-center opacity-80 group-hover:scale-105 transition-transform duration-500">
                                                        <MonitorPlay size={40} className="text-white/20" />
                                                    </div>
                                                )}
                                                
                                                {/* Date Badge */}
                                                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                                                    {content.date ? content.date.split('T')[0] : 'No Date'}
                                                </div>
                                            </div>

                                            {/* Content Details */}
                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <h4 className="text-base font-extrabold text-white mb-4 line-clamp-2 leading-snug group-hover:text-brand-accent transition-colors drop-shadow-sm" title={content.title}>
                                                    {content.title}
                                                </h4>
                                                
                                                {/* Action Buttons */}
                                                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                                                    <button onClick={() => {
                                                        let fileUrl = content.fileName ? `${getBaseUrl()}/storage/documents/${content.fileName}` : content.link;
                                                        setPreviewData({ ...content, link: fileUrl });
                                                    }} className="flex-1 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm outline-none">
                                                        PREVIEW
                                                    </button>
                                                    
                                                    {canManageContent && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { 
                                                                setEditData(content); setEditMode(true); setShowContentModal(true); setContentType(contentTab); 
                                                                if(content.assignedCourses && content.assignedCourses.length > 0) { setMassAssignSubjects(content.assignedCourses); } 
                                                                else { setMassAssignSubjects([activeSubject.id]); }
                                                                setSelectedBatchesForContent([activeBatch.id]);
                                                            }} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white p-2.5 rounded-xl transition-colors shadow-sm outline-none">
                                                                <Edit3 size={18}/>
                                                            </button>
                                                            <button onClick={() => deleteItem('/admin/content/delete', { content_id: content.id }, "Content Deleted")} className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors shadow-sm outline-none">
                                                                <Trash2 size={18}/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        ))}
                                </div>
                                {subjectContents.filter(c => isMatchedType(c) && !getFolderId(c)).length === 0 && <p className="text-sm text-gray-400 py-8 text-center font-bold bg-white/5 rounded-2xl border border-white/10 shadow-inner">No uncategorized items.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}