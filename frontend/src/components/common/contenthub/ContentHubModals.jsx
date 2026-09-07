import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, UploadCloud, Users, UserPlus, CheckCircle, Plus, Edit3, Trash2, CreditCard, MessageSquare, MonitorPlay, ExternalLink, Ban, BookOpen, Building2, User, Layers, Save, FolderOpen, Clock } from 'lucide-react';
import api from '../../../api/axios'; 

export default function ContentHubModals({ state, actions }) {
    const [modalTimerMode, setModalTimerMode] = useState('FLEXIBLE');

    const {
        isSystemAdmin, businesses, managersList, batches, lessonGroups, postsList, showBusinessModal, showAssignModal, showBatchModal, showGroupModal,
        showCourseModal, showLessonGroupModal, showContentModal, showPostModal, showManagePostsModal, previewData, editMode, editData, selectedLogoName,
        selectedGroupPrices, discountRules, contentType, prefilledFolder, selectedBatchesForContent, massAssignSubjects, postBizId, postBatches, showInstallmentModal,
        existingInstallments, editInstallmentId, installmentSubjectCount, installmentSteps, activeBusiness, activeBatch, activeSubject, loading, showLecturerModal, masterTutes,
        hubBatchConfigs, hubActiveBatchTab, parentFolderForSub, selectedFolderParentId
    } = state;

    useEffect(() => {
        if (editData?.paper?.timerMode) {
            setModalTimerMode(editData.paper.timerMode);
        } else {
            setModalTimerMode('FLEXIBLE');
        }
    }, [editData, showContentModal]);

    const {
        setShowBusinessModal, setShowAssignModal, setShowBatchModal, setShowGroupModal, setShowCourseModal, setShowLessonGroupModal, setShowContentModal,
        setShowPostModal, setShowManagePostsModal, setPreviewData, setSelectedLogoName, setContentType, setPostBizId,
        handlePostSubmit, handleBusinessSubmit, handleAssignManagers, handleBatchSubmit, handleGroupSubmit, handleCourseSubmit, handleLessonGroupSubmit, handleMassAssignSubmit,
        getPostImageUrl, getEmbedUrl, deleteItem, fetchPosts, addDiscountRule, removeDiscountRule, handleDiscountRuleChange, addInstallmentStep, removeInstallmentStep,
        toggleGroupPrice, updateGroupData, toggleMassAssignSubject, getTypeInt, setPrefilledFolder, setSelectedBatchesForContent, setMassAssignSubjects,
        setShowInstallmentModal, handleEditInstallment, handleDeleteInstallment, handleInstallmentSubmit, setInstallmentSubjectCount, setInstallmentSteps, setEditInstallmentId, getBatchStreams,
        setEditData, setDiscountRules, setSelectedGroupPrices, setShowLecturerModal, handleLecturerSubmit, setHubBatchConfigs, setHubActiveBatchTab,
        setSelectedFolderParentId
    } = actions;

    const getBaseUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            let url = api.defaults.baseURL || 'http://localhost:5000/api';
            return url.endsWith('/') ? url.slice(0, -1) : url;
        }
        return 'https://imacampus.online/api';
    };

    const normalizeFolderTitle = (title) => {
        if (!title) return '';
        return title
            .toLowerCase()
            .replace(/[\s_-]+/g, ' ')
            .replace(/\b(month|batch|මාසය|මාස|පාඩම|පාඩම්)\b/gi, '')
            .trim();
    };

    const getSelectedFolderValue = () => {
        if (!editMode) return prefilledFolder ? String(prefilledFolder) : '';

        const currentTypeGroups = (lessonGroups || []).filter(g => parseInt(g.type) === getTypeInt(contentType));
        const targetId = editData?.contentGroupId ?? editData?.content_group_id;

        if (targetId && currentTypeGroups.some(g => String(g.id) === String(targetId))) {
            return String(targetId);
        }

        const targetTitle = editData?.groupTitle || editData?.group?.title;
        if (targetTitle) {
            const rawTarget = targetTitle.trim().toLowerCase();
            const normTarget = normalizeFolderTitle(targetTitle);
            const matched = currentTypeGroups.find(g => {
                const rawG = (g.title || g.name || '').trim().toLowerCase();
                const normG = normalizeFolderTitle(g.title || g.name);
                return rawG === rawTarget || (normTarget && normG && normG === normTarget);
            });
            if (matched) return String(matched.id);
        }

        return targetId ? String(targetId) : '';
    };

    const activeHubBatch = hubActiveBatchTab || (batches.length > 0 ? batches[0].id : null);
    
    const handleHubSubjectToggle = (batchId, subjectId, courseCode) => {
        setHubBatchConfigs(prev => {
            const batchConfig = prev[batchId] || {};
            const initialFolder = prefilledFolder ? String(prefilledFolder) : '';
            const subjectConfig = batchConfig[subjectId] || { isChecked: false, folderId: initialFolder, courseCode };
            return {
                ...prev,
                [batchId]: {
                    ...batchConfig,
                    [subjectId]: { 
                        ...subjectConfig, 
                        isChecked: !subjectConfig.isChecked, 
                        folderId: subjectConfig.folderId || initialFolder,
                        courseCode 
                    }
                }
            };
        });
    };

    const handleHubFolderChange = (batchId, subjectId, folderId, courseCode) => {
        setHubBatchConfigs(prev => {
            const batchConfig = prev[batchId] || {};
            const subjectConfig = batchConfig[subjectId] || { isChecked: true, folderId: '', courseCode };
            return {
                ...prev,
                [batchId]: {
                    ...batchConfig,
                    [subjectId]: { ...subjectConfig, isChecked: true, folderId, courseCode }
                }
            };
        });
    };

    const modalContent = (
        <>
            {/* ADD CONTENT MODAL */}
            {showContentModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-2xl sm:rounded-[2rem] w-full max-w-7xl max-h-[92vh] sm:max-h-[95vh] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl">
                        <div className="p-4 sm:p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02] rounded-t-2xl sm:rounded-t-[2rem]">
                            <h3 className="text-lg sm:text-2xl font-extrabold text-white flex items-center gap-2.5 sm:gap-3 drop-shadow-sm"><Plus className="text-green-400 w-6 h-6 sm:w-7 sm:h-7" /> {editMode ? 'Edit Content' : 'Add Content (Multi-Batch)'}</h3>
                            <button onClick={() => { setShowContentModal(false); setContentType(''); setPrefilledFolder(''); setMassAssignSubjects([]); setSelectedBatchesForContent([]); }} className="text-gray-400 hover:text-white bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded-xl transition-all hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={18}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
                            <form key={`form-${editMode ? editData?.id : 'new'}`} onSubmit={handleMassAssignSubmit} className="space-y-8 max-w-6xl mx-auto">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Content Type *</label>
                                        <select value={contentType} onChange={e => setContentType(e.target.value)} disabled={editMode} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 disabled:opacity-50 shadow-inner cursor-pointer appearance-none">
                                            <option value="" disabled className="bg-slate-800 text-white">Select Type</option>
                                            <option value="live" className="bg-slate-800 text-white">Live Class</option><option value="recording" className="bg-slate-800 text-white">Recording</option>
                                            <option value="document" className="bg-slate-800 text-white">Document / PDF</option><option value="sPaper" className="bg-slate-800 text-white">Structured Paper</option><option value="paper" className="bg-slate-800 text-white">MCQ Paper</option>
                                        </select>
                                    </div>
                                    
                                    {contentType && (
                                        <div className="flex-1 animate-in fade-in duration-300">
                                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Target Folder (Current Batch)</label>
                                            <select 
                                                name="contentGroupId" 
                                                value={getSelectedFolderValue()} 
                                                onChange={(e) => { 
                                                    const val = e.target.value;
                                                    if (editMode) { 
                                                        setEditData(prev => ({...prev, contentGroupId: val, content_group_id: val, groupTitle: null }));
                                                    } else { 
                                                        setPrefilledFolder(val); 
                                                        // Sync to all checked subjects in hubBatchConfigs
                                                        setHubBatchConfigs(prev => {
                                                            const updated = { ...prev };
                                                            Object.keys(updated).forEach(bId => {
                                                                Object.keys(updated[bId] || {}).forEach(cId => {
                                                                    if (updated[bId][cId]?.isChecked) {
                                                                        updated[bId][cId] = { ...updated[bId][cId], folderId: val };
                                                                    }
                                                                });
                                                            });
                                                            return updated;
                                                        });
                                                    } 
                                                }} 
                                                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 shadow-inner cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-800 text-white">No Folder (Uncategorized)</option>
                                                {lessonGroups
                                                    .filter(g => parseInt(g.type) === getTypeInt(contentType) && !g.parentId)
                                                    .map(rootFolder => {
                                                        const subs = lessonGroups.filter(g => parseInt(g.type) === getTypeInt(contentType) && g.parentId === rootFolder.id);
                                                        return (
                                                            <React.Fragment key={rootFolder.id}>
                                                                <option value={String(rootFolder.id)} className="bg-slate-800 text-white font-bold">
                                                                    📁 {rootFolder.title || rootFolder.name}
                                                                </option>
                                                                {subs.map(sub => (
                                                                    <option key={sub.id} value={String(sub.id)} className="bg-slate-900 text-indigo-300 font-semibold">
                                                                        &nbsp;&nbsp;&nbsp;&nbsp;↳ 📂 {sub.title || sub.name} (Sub-folder)
                                                                    </option>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {contentType && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-black/30 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                            <div className="md:col-span-3">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Title *</label>
                                                <input type="text" name="title" defaultValue={editData?.title} required className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Display Order *</label>
                                                <input type="number" name="itemOrder" defaultValue={editData?.itemOrder || 1} required className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                            </div>
                                            
                                            {(contentType === 'live' || contentType === 'recording') && (
                                                <div className="md:col-span-2 space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">URL Link *</label>
                                                        <input type="url" name="link" defaultValue={editData?.link} required className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">YouTube Link (Optional)</label>
                                                        <input type="url" name="youtubeLink" defaultValue={editData?.youtubeLink} className="w-full bg-black/60 border border-white/10 focus:border-red-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all" placeholder="https://www.youtube.com/watch?v=..." />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Vimeo Link (Optional)</label>
                                                        <input type="url" name="vimeoLink" defaultValue={editData?.vimeoLink} className="w-full bg-black/60 border border-white/10 focus:border-blue-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all" placeholder="https://vimeo.com/..." />
                                                    </div>
                                                </div>
                                            )}

                                            {contentType === 'recording' && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Meeting ID</label>
                                                    <input type="text" name="zoomMeetingId" defaultValue={editData?.meetingId} className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                                </div>
                                            )}

                                            {(contentType === 'live' || contentType === 'recording' || contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Thumbnail Image (Optional) {editMode && <span className="text-green-400 font-normal ml-2 normal-case">(Leave empty to keep existing)</span>}</label>
                                                    <input type="file" name="thumbnail" accept="image/*" className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-white/10 file:text-white shadow-inner cursor-pointer" />
                                                </div>
                                            )}

                                            {(contentType === 'document' || contentType === 'sPaper') && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">File Upload {editMode && <span className="text-green-400 font-normal ml-2 normal-case">(Leave empty to keep existing)</span>}</label>
                                                    <input type="file" name="file" required={!editMode} className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-white/10 file:text-white shadow-inner cursor-pointer" />
                                                </div>
                                            )}

                                            <div className="md:col-span-4">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Date</label>
                                                <input type={(contentType==='document'||contentType==='sPaper') ? "month":"date"} name="date" defaultValue={editData?.date ? ((contentType==='document'||contentType==='sPaper') ? editData.date.substring(0, 7) : editData.date.split('T')[0]) : ''} required className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner cursor-pointer transition-all appearance-none" />
                                            </div>

                                            {contentType === 'live' && (
                                                <>
                                                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Start Time</label><input type="time" name="startTime" defaultValue={editData?.startTime} className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner cursor-pointer transition-all appearance-none" /></div>
                                                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">End Time</label><input type="time" name="endTime" defaultValue={editData?.endTime} className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner cursor-pointer transition-all appearance-none" /></div>
                                                    <div className="md:col-span-4 mt-2">
                                                        <label className="flex items-center gap-4 cursor-pointer w-max group bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-sm mb-4">
                                                            <div className="relative flex items-center justify-center">
                                                                <input type="checkbox" id="autoDeleteToggle" defaultChecked={!!editData?.autoDeleteHours} className="peer w-6 h-6 appearance-none bg-black/60 border-2 border-slate-500 rounded-lg checked:bg-green-500 checked:border-green-500 transition-colors" onChange={(e) => { document.getElementById('autoDeleteInputContainer').style.display = e.target.checked ? 'block' : 'none'; if(!e.target.checked) document.getElementById('autoDeleteHoursInput').value = ''; }} />
                                                                <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"/>
                                                            </div>
                                                            <span className="text-base font-bold text-slate-200">Enable Auto Delete Link</span>
                                                        </label>
                                                        <div id="autoDeleteInputContainer" style={{ display: editData?.autoDeleteHours ? 'block' : 'none' }}>
                                                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Auto Delete (Hours after End Time)</label>
                                                            <input type="number" step="0.1" id="autoDeleteHoursInput" name="autoDeleteHours" placeholder="e.g. 3 (Link deletes 3 hours after End Time)" defaultValue={editData?.autoDeleteHours} className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-4 text-white outline-none shadow-inner transition-all appearance-none" />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {contentType === 'paper' && (
                                                <div className="md:col-span-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                        <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                                            <Clock size={16} /> Exam Timer & Execution Rules
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-semibold">How students take this paper</span>
                                                    </div>

                                                    {/* Timer Mode Selection */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">Timer Mode *</label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            
                                                            {/* Flexible Start Option */}
                                                            <label 
                                                                onClick={() => setModalTimerMode('FLEXIBLE')}
                                                                className={`cursor-pointer border rounded-xl p-3.5 flex items-start gap-3 transition-all ${
                                                                    modalTimerMode === 'FLEXIBLE' 
                                                                        ? 'bg-brand-accent/20 border-brand-accent ring-1 ring-brand-accent text-white' 
                                                                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                                                                }`}
                                                            >
                                                                <input 
                                                                    type="radio" 
                                                                    name="timerMode" 
                                                                    value="FLEXIBLE" 
                                                                    checked={modalTimerMode === 'FLEXIBLE'} 
                                                                    onChange={() => setModalTimerMode('FLEXIBLE')} 
                                                                    className="mt-1 accent-rose-600" 
                                                                />
                                                                <div>
                                                                    <p className="text-xs font-extrabold text-white">Flexible Start (Individual Countdown)</p>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                                                        Countdown begins as soon as the student clicks 'Start Exam'.
                                                                    </p>
                                                                </div>
                                                            </label>

                                                            {/* Scheduled Start Option */}
                                                            <label 
                                                                onClick={() => setModalTimerMode('SCHEDULED')}
                                                                className={`cursor-pointer border rounded-xl p-3.5 flex items-start gap-3 transition-all ${
                                                                    modalTimerMode === 'SCHEDULED' 
                                                                        ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500 text-white' 
                                                                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                                                                }`}
                                                            >
                                                                <input 
                                                                    type="radio" 
                                                                    name="timerMode" 
                                                                    value="SCHEDULED" 
                                                                    checked={modalTimerMode === 'SCHEDULED'} 
                                                                    onChange={() => setModalTimerMode('SCHEDULED')} 
                                                                    className="mt-1 accent-amber-500" 
                                                                />
                                                                <div>
                                                                    <p className="text-xs font-extrabold text-white">Scheduled Start (Synchronized Time)</p>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                                                        Synchronized countdown to an exact scheduled date and time.
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* If Scheduled Mode: Show Scheduled Start Time picker */}
                                                    {modalTimerMode === 'SCHEDULED' && (
                                                        <div className="animate-in fade-in space-y-1.5 pt-1">
                                                            <label className="text-xs font-bold text-amber-400 block uppercase tracking-wider">Scheduled Start Time *</label>
                                                            <input 
                                                                type="time" 
                                                                name="scheduledStartTime" 
                                                                defaultValue={editData?.paper?.scheduledStartTime ? new Date(editData.paper.scheduledStartTime).toTimeString().slice(0, 5) : ''} 
                                                                required={modalTimerMode === 'SCHEDULED'}
                                                                className="w-full bg-black/60 border border-amber-500/40 focus:border-amber-400 focus:bg-black/80 rounded-xl p-3.5 text-white outline-none shadow-inner text-sm font-bold cursor-pointer" 
                                                            />
                                                            <p className="text-[11px] text-slate-400 italic">Starts on the Date selected above.</p>
                                                        </div>
                                                    )}

                                                    {/* Duration & Pass Marks Inputs */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Exam Duration (Minutes) *</label>
                                                            <input 
                                                                type="number" 
                                                                name="paperTime" 
                                                                defaultValue={editData?.paperTime || editData?.paper?.durationMinutes || 60} 
                                                                placeholder="e.g. 60" 
                                                                required 
                                                                className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-3.5 text-white outline-none shadow-inner transition-all text-sm font-bold" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Pass Marks (%)</label>
                                                            <input 
                                                                type="number" 
                                                                name="passMarks" 
                                                                defaultValue={editData?.paper?.passMarks || 40} 
                                                                placeholder="e.g. 40" 
                                                                className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-3.5 text-white outline-none shadow-inner transition-all text-sm font-bold" 
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Optional Student Instructions */}
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Instructions for Students (Optional)</label>
                                                        <textarea 
                                                            name="instructions" 
                                                            rows="2" 
                                                            defaultValue={editData?.paper?.instructions || ''} 
                                                            placeholder="e.g. You have 60 minutes to complete all questions. Once submitted, answers cannot be changed." 
                                                            className="w-full bg-black/60 border border-white/10 focus:border-green-500 focus:bg-black/80 rounded-xl p-3 text-white outline-none shadow-inner text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="md:col-span-4 mt-4">
                                                <label className="flex items-center gap-4 cursor-pointer w-max group bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all shadow-sm">
                                                    <div className="relative flex items-center justify-center">
                                                        <input type="checkbox" name="isFree" value="1" defaultChecked={editData?.isFree} className="peer w-6 h-6 appearance-none bg-black/60 border-2 border-slate-500 rounded-lg checked:bg-green-500 checked:border-green-500 transition-colors" />
                                                        <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"/>
                                                    </div>
                                                    <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">Mark as Free Content (Open for all)</span>
                                                </label>
                                            </div>
                                        </div>

                                        <input type="hidden" name="selectedCourses" value={JSON.stringify(massAssignSubjects)} />
                                        
                                        <div className="pt-8 border-t border-white/10 mt-8">
                                            <div className="flex justify-between items-end mb-6">
                                                <h4 className="text-xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><BookOpen size={24} className="text-blue-400"/> Assign to Subjects</h4>
                                            </div>

                                            {editMode ? (
                                                <>
                                                    <div className="bg-black/30 p-6 md:p-8 rounded-[2rem] mb-6 border border-white/5 shadow-inner">
                                                        <label className="text-xs font-bold text-gray-400 mb-4 block uppercase tracking-wider">Share with multiple Batches (Merge Content):</label>
                                                        <div className="flex flex-wrap gap-4">
                                                            {batches.map(b => (
                                                                <label key={`b-sel-${b.id}`} className={`flex items-center gap-3 px-5 py-3 rounded-xl cursor-pointer transition-all border shadow-sm ${selectedBatchesForContent.includes(b.id) ? 'bg-blue-500/20 border-blue-500/50 text-white' : 'bg-black/50 border-white/10 text-gray-400 hover:bg-black/70 hover:text-gray-300'}`}>
                                                                    <input type="checkbox" className="hidden" 
                                                                        checked={selectedBatchesForContent.includes(b.id)} 
                                                                        onChange={(e) => {
                                                                            if(e.target.checked) setSelectedBatchesForContent([...selectedBatchesForContent, b.id]);
                                                                            else setSelectedBatchesForContent(selectedBatchesForContent.filter(id => id !== b.id));
                                                                        }} 
                                                                    />
                                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedBatchesForContent.includes(b.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                                                        {selectedBatchesForContent.includes(b.id) && <CheckCircle size={12} className="text-white"/>}
                                                                    </div>
                                                                    <span className="font-bold text-sm">{b.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="bg-black/30 rounded-[2rem] p-6 md:p-8 border border-white/5 space-y-8 shadow-inner">
                                                        {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                                            <div key={`batch-group-${selectedBatch.id}`} className="mb-6">
                                                                <h4 className="text-xl font-extrabold text-blue-400 mb-6 border-b border-white/10 pb-3 drop-shadow-sm">{selectedBatch.name}</h4>
                                                                
                                                                {selectedBatch.groups?.length === 0 && <p className="text-sm text-slate-500 font-medium">No groups in this batch.</p>}

                                                                {selectedBatch.groups?.map((group, gIdx) => (
                                                                    <div key={`g-assign-${gIdx}`} className="mb-8 ml-2 md:ml-6">
                                                                        <h5 className="text-lg font-bold text-slate-200 mb-4">{group.name} <span className="text-[10px] font-bold text-slate-400 bg-white/10 px-3 py-1 rounded-lg ml-3 border border-white/10 uppercase tracking-wider shadow-inner">{group.type === 1 ? 'Monthly' : 'Full'}</span></h5>
                                                                        
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                            {group.courses?.map((course, cIdx) => (
                                                                                <label key={`c-assign-${cIdx}`} className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all shadow-sm group ${massAssignSubjects.includes(course.id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-black/50 border-white/10 hover:border-white/30 hover:bg-black/70'}`}>
                                                                                    <div className="relative flex items-center justify-center shrink-0">
                                                                                        <input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="peer w-6 h-6 appearance-none bg-black/60 border-2 border-slate-500 rounded-lg checked:bg-blue-500 checked:border-blue-500 transition-colors" />
                                                                                        <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"/>
                                                                                    </div>
                                                                                    <span className={`text-sm font-bold truncate transition-colors ${massAssignSubjects.includes(course.id) ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{course.name}</span>
                                                                                </label>
                                                                            ))}
                                                                            {group.courses?.length === 0 && <p className="text-xs text-slate-500 font-medium">No subjects in this group.</p>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="bg-black/30 rounded-[2rem] p-6 md:p-8 border border-white/5 space-y-8 shadow-inner">
                                                    {/* Batch Tabs */}
                                                    <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
                                                        {batches.map(b => (
                                                            <button 
                                                                key={`hub-tab-${b.id}`} 
                                                                type="button"
                                                                onClick={() => setHubActiveBatchTab(b.id)}
                                                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all outline-none ${activeHubBatch === b.id ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'bg-black/40 text-gray-400 border border-white/10 hover:text-white hover:bg-black/60 hover:border-white/20'}`}
                                                            >
                                                                {b.name}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Active Batch Content */}
                                                    {batches.map(batch => {
                                                        if(batch.id !== activeHubBatch) return null;
                                                        
                                                        const bConfig = hubBatchConfigs[batch.id] || {};

                                                        return (
                                                            <div key={`hub-batch-view-${batch.id}`} className="space-y-6">
                                                                {batch.groups?.length === 0 && <p className="text-sm text-slate-500 font-medium">No groups in this batch.</p>}

                                                                {batch.groups?.map(group => (
                                                                    <div key={`hub-group-${group.id}`} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 shadow-sm">
                                                                        <h5 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                                                                            {group.name} 
                                                                            <span className="text-[10px] font-bold text-slate-400 bg-black/60 px-3 py-1 rounded-lg border border-white/10 uppercase tracking-wider">{group.type === 1 ? 'Monthly' : 'Full'}</span>
                                                                        </h5>
                                                                        
                                                                        <div className="space-y-4">
                                                                            {group.courses?.map(course => {
                                                                                const subjectConfig = bConfig[course.id] || { isChecked: false, folderId: '' };
                                                                                const courseCode = course.code || `SUB_${course.id}`;
                                                                                // Filter folders that have matching courseCode or matching type
                                                                                const availableFolders = lessonGroups.filter(lg => 
                                                                                    parseInt(lg.type) === getTypeInt(contentType) &&
                                                                                    (!lg.courseCode || lg.courseCode === courseCode || lg.courseCode === course.code || (activeSubject && lg.courseCode === (activeSubject.code || `SUB_${activeSubject.id}`)))
                                                                                );

                                                                                return (
                                                                                    <div key={`hub-subject-${course.id}`} className={`p-4 rounded-2xl border transition-all ${subjectConfig.isChecked ? 'bg-blue-600/10 border-blue-500/50' : 'bg-black/40 border-white/10 hover:border-white/30'}`}>
                                                                                        <label className="flex items-center gap-4 cursor-pointer w-full group">
                                                                                            <div className="relative flex items-center justify-center shrink-0">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    checked={subjectConfig.isChecked}
                                                                                                    onChange={() => handleHubSubjectToggle(batch.id, course.id, courseCode)}
                                                                                                    className="peer w-6 h-6 appearance-none bg-black/60 border-2 border-slate-500 rounded-lg checked:bg-blue-500 checked:border-blue-500 transition-colors" 
                                                                                                />
                                                                                                <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"/>
                                                                                            </div>
                                                                                            <span className={`text-sm font-bold truncate transition-colors ${subjectConfig.isChecked ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{course.name}</span>
                                                                                        </label>

                                                                                        {subjectConfig.isChecked && (
                                                                                            <div className="mt-4 ml-10 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                                                <select 
                                                                                                    value={subjectConfig.folderId}
                                                                                                    onChange={(e) => handleHubFolderChange(batch.id, course.id, e.target.value, courseCode)}
                                                                                                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500 text-sm appearance-none"
                                                                                                >
                                                                                                    <option value="" className="bg-slate-900">Select Folder</option>
                                                                                                    <option value="uncategorized" className="bg-slate-900 text-yellow-400 font-bold">No Folder (Uncategorized)</option>
                                                                                                    {availableFolders
                                                                                                        .filter(f => !f.parentId)
                                                                                                        .map(rf => {
                                                                                                            const sfs = availableFolders.filter(f => f.parentId === rf.id);
                                                                                                            return (
                                                                                                                <React.Fragment key={`hf-${rf.id}`}>
                                                                                                                    <option value={rf.id} className="bg-slate-900 font-bold">📁 {rf.name || rf.title}</option>
                                                                                                                    {sfs.map(sf => (
                                                                                                                        <option key={`hf-sub-${sf.id}`} value={sf.id} className="bg-slate-950 text-indigo-300">
                                                                                                                            &nbsp;&nbsp;&nbsp;&nbsp;↳ 📂 {sf.name || sf.title}
                                                                                                                        </option>
                                                                                                                    ))}
                                                                                                                </React.Fragment>
                                                                                                            );
                                                                                                        })}
                                                                                                </select>
                                                                                                <button type="button" onClick={() => { setShowLessonGroupModal(true); setPrefilledFolder(courseCode); }} className="flex-shrink-0 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-white/10 flex items-center gap-2 outline-none">
                                                                                                    <Plus size={16}/> New
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-6 pb-4">
                                            <button type="submit" className="w-full bg-green-600/90 hover:bg-green-500 text-white font-extrabold text-lg py-4 rounded-2xl shadow-[0_4px_15px_rgba(22,163,74,0.4)] mt-4 transition-transform hover:scale-[1.01] outline-none tracking-wide uppercase border border-transparent">
                                                {editMode ? 'Update Content' : 'Publish Content'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* SETUP BUSINESS MODAL */}
            {showBusinessModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-6xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Building2 className="text-blue-400"/> {editMode ? 'Edit Business Configuration' : 'Setup New Business'}</h3>
                            <button onClick={() => setShowBusinessModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-all hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleBusinessSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="flex flex-col lg:flex-row gap-10">
                                <div className="flex-1 space-y-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 drop-shadow-sm">Basic Information</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Business Name *</label>
                                            <input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 transition-all shadow-inner" placeholder="e.g. Science Academy" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Category *</label>
                                            <select name="category" defaultValue={editData?.category || "Advance Level"} required onChange={(e) => { document.getElementById('streamsDiv').style.display = (e.target.value === 'Advance Level' || e.target.value === 'AL') ? 'block' : 'none'; }} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none">
                                                <option value="Advance Level" className="bg-slate-800 text-white">Advance Level</option>
                                                <option value="Ordinary Level" className="bg-slate-800 text-white">Ordinary Level</option>
                                                <option value="Others" className="bg-slate-800 text-white">Others</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Medium *</label>
                                            <select name="medium" defaultValue={editData?.isEnglish ? 'English' : 'Sinhala'} required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none">
                                                <option value="Sinhala" className="bg-slate-800 text-white">Sinhala Medium</option>
                                                <option value="English" className="bg-slate-800 text-white">English Medium</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Merchant ID (Payment Gateway)</label>
                                            <select name="merchantId" defaultValue={editData?.merchantId || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none">
                                                <option value="" className="bg-slate-800 text-white">Default / Unassigned</option>
                                                <option value="14008328" className="bg-slate-800 text-white">14008328 - IMA Arts New</option>
                                                <option value="14008329" className="bg-slate-800 text-white">14008329 - IMA OL New</option>
                                                <option value="14008330" className="bg-slate-800 text-white">14008330 - IMA Commerce New</option>
                                                <option value="14008331" className="bg-slate-800 text-white">14008331 - IMA Tech New</option>
                                                <option value="14008332" className="bg-slate-800 text-white">14008332 - IMA Education New</option>
                                                <option value="14008333" className="bg-slate-800 text-white">14008333 - IMA English New</option>
                                                <option value="14008334" className="bg-slate-800 text-white">14008334 - IMA Fast Track New</option>
                                                <option value="14008335" className="bg-slate-800 text-white">14008335 - Iddamalgoda Media Academy New</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Description (Optional)</label>
                                        <textarea name="description" defaultValue={editData?.description} rows="4" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 resize-none shadow-inner transition-all"></textarea>
                                    </div>
                                </div>

                                <div className="w-full lg:w-[450px] space-y-6 shrink-0">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 drop-shadow-sm">Branding & Logic</h4>
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Business Logo *</label>
                                        <label className="flex items-center justify-center h-28 border-2 border-dashed border-white/20 rounded-xl bg-black/40 cursor-pointer hover:bg-black/60 transition-colors hover:border-brand-accent/50 shadow-inner">
                                            <div className="flex flex-col items-center gap-2">
                                                <UploadCloud size={28} className="text-brand-accent drop-shadow-sm"/>
                                                <span className="text-xs text-slate-300 font-bold">{selectedLogoName || "Select Image File"}</span>
                                            </div>
                                            <input type="file" name="logo" accept="image/*" className="hidden" onChange={(e) => setSelectedLogoName(e.target.files[0]?.name || "")} />
                                        </label>
                                    </div>

                                    <div id="streamsDiv" style={{display: (editData?.category === 'Advance Level' || editData?.category === 'AL' || !editData) ? 'block' : 'none'}} className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 shadow-inner">
                                        <label className="text-xs font-extrabold text-blue-300 mb-4 block uppercase tracking-widest drop-shadow-sm">A/L Streams (Select all that apply)</label>
                                        <div className="flex flex-wrap gap-3">
                                            {['Art', 'Commerce', 'Tech', 'Bio', 'Maths'].map(s => (
                                                <label key={s} className="flex items-center gap-2 cursor-pointer text-white text-xs font-bold bg-black/50 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-black/70 transition-colors shadow-sm">
                                                    <input type="checkbox" name={`stream_${s}`} value={s} defaultChecked={editData?.streams?.includes(s)} className="w-4 h-4 accent-blue-500 transition-transform"/> {s}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 shadow-inner">
                                        <label className="flex items-start gap-4 cursor-pointer group">
                                            <input type="checkbox" name="isDiscountEnabledForInstallments" value="1" defaultChecked={editData?.isDiscountEnabledForInstallments} className="w-6 h-6 accent-orange-500 mt-0.5 shrink-0 transition-transform"/>
                                            <div>
                                                <span className="text-sm font-extrabold text-white group-hover:text-orange-300 transition-colors drop-shadow-sm">Allow Installment Discounts?</span>
                                                <p className="text-[11px] text-orange-200/70 mt-1.5 font-bold leading-relaxed">If ticked, students paying via installments will still receive the bundle discount.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10 mt-6 shrink-0">
                                <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.01] uppercase tracking-wide flex justify-center items-center gap-2 outline-none border border-transparent">
                                    {editMode ? 'Update Business Settings' : 'Initialize New Business'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ASSIGN MANAGERS MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-8 w-full max-w-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><UserPlus className="text-blue-400"/> Assign Managers</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-all hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAssignManagers} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Head Manager</label>
                                    <select name="head_manager" defaultValue={editData?.head_manager_id || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 shadow-inner cursor-pointer appearance-none">
                                        <option value="" className="bg-slate-800 text-white">-- Select Manager --</option>
                                        {managersList.filter(m => m.role === 'Manager' || m.role === 'MANAGER').map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.firstName} {m.lastName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Assistant Manager</label>
                                    <select name="ass_manager" defaultValue={editData?.ass_manager_id || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 shadow-inner cursor-pointer appearance-none">
                                        <option value="" className="bg-slate-800 text-white">-- Select Asst. Manager --</option>
                                        {managersList.filter(m => m.role === 'Ass Manager' || m.role === 'ASS_MANAGER').map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.firstName} {m.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.01] uppercase tracking-wide outline-none border border-transparent">Assign Staff</button>
                        </form>
                    </div>
                </div>
            )}

            {/* BATCH MODAL */}
            {showBatchModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-8 w-full max-w-4xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Layers className="text-blue-400"/> {editMode ? 'Edit Batch' : 'New Batch'}</h3>
                            <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleBatchSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Batch Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" /></div>
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Logo Image (Optional)</label>
                                <input type="file" name="logo" className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-gray-400 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 cursor-pointer shadow-inner transition-all" onChange={(e) => setSelectedLogoName(e.target.files[0]?.name || "")} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Batch Type *</label>
                                    <select name="type" defaultValue={editData?.type || "1"} required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent shadow-inner cursor-pointer appearance-none transition-all">
                                        <option value="1" className="bg-slate-800 text-white">Theory only</option><option value="2" className="bg-slate-800 text-white">Paper only</option><option value="3" className="bg-slate-800 text-white">Theory and Paper</option><option value="4" className="bg-slate-800 text-white">Others</option>
                                    </select>
                                </div>
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Display Order</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" /></div>
                                
                                {/* Start Month and End Month */}
                                <div>
                                    <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Start Month</label>
                                    <select name="startMonth" defaultValue={editData?.startMonth || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all appearance-none cursor-pointer">
                                        <option value="" className="bg-slate-800 text-gray-400">Select Start Month</option>
                                        {["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].map(m => (
                                            <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">End Month</label>
                                    <select name="endMonth" defaultValue={editData?.endMonth || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all appearance-none cursor-pointer">
                                        <option value="" className="bg-slate-800 text-gray-400">Select End Month</option>
                                        {["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].map(m => (
                                            <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Description</label><textarea name="description" defaultValue={editData?.description} rows="3" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 resize-none shadow-inner transition-all"></textarea></div>
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wider border border-transparent">{editMode ? 'Update Batch' : 'Create Batch'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* PAYMENT GROUP MODAL */}
            {showGroupModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-5xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Layers className="text-blue-400"/> {editMode ? 'Edit Payment Group' : 'New Payment Group'}</h3>
                            <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleGroupSubmit} className="space-y-8 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Group Name *</label><input type="text" name="name" defaultValue={editData?.name} placeholder="e.g. 2026 Monthly Jan" required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" /></div>
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Order Number</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" /></div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Payment Type *</label>
                                    <select name="paymentType" defaultValue={editData?.type === 1 ? "Monthly" : "Full Payment"} required onChange={(e) => { document.getElementById('discountRulesSection').style.display = e.target.value === 'Full Payment' ? 'block' : 'none'; }} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none transition-all">
                                        <option value="Monthly" className="bg-slate-800 text-white">Monthly Payment</option><option value="Full Payment" className="bg-slate-800 text-white">Full Payment</option>
                                    </select>
                                </div>
                            </div>

                            <div id="discountRulesSection" style={{display: (editData?.type === 2 || !editMode) ? 'block' : 'none'}} className="bg-blue-500/10 border border-blue-500/20 p-6 md:p-8 rounded-[2rem] shadow-inner">
                                <div className="flex justify-between items-center mb-6">
                                    <div><h4 className="text-lg font-extrabold text-blue-400 uppercase tracking-widest drop-shadow-sm">Bundle Discount Rules</h4></div>
                                    <button type="button" onClick={addDiscountRule} className="bg-blue-600/90 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 outline-none shadow-sm border border-transparent"><Plus size={18}/> Add Rule</button>
                                </div>
                                <div className="space-y-4">
                                    {discountRules.map((rule, idx) => (
                                        <div key={idx} className="flex flex-col lg:flex-row gap-3 items-end bg-black/40 p-4 rounded-2xl border border-white/10 shadow-sm">
                                            <div className="w-full lg:w-32"><label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Subjects *</label><input type="number" value={rule.courseCount ?? ''} onChange={(e) => handleDiscountRuleChange(idx, 'courseCount', e.target.value)} placeholder="e.g. 3" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 shadow-inner transition-all" /></div>
                                            <div className="flex-1 w-full"><label className="text-[11px] font-bold text-emerald-400 mb-1.5 block uppercase tracking-wider">Total Package Price (Option 1)</label><input type="number" value={rule.packagePrice ?? ''} onChange={(e) => handleDiscountRuleChange(idx, 'packagePrice', e.target.value)} placeholder="e.g. 60000" className="w-full bg-black/60 border border-emerald-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500 shadow-inner transition-all" /></div>
                                            <div className="flex-1 w-full"><label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Price/Sub (Option 2)</label><input type="number" value={rule.pricePerCourse ?? ''} onChange={(e) => handleDiscountRuleChange(idx, 'pricePerCourse', e.target.value)} placeholder="e.g. 20000" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 shadow-inner transition-all" /></div>
                                            <div className="flex-1 w-full"><label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Fixed Off (Option 3)</label><input type="number" value={rule.fixedDiscount ?? ''} onChange={(e) => handleDiscountRuleChange(idx, 'fixedDiscount', e.target.value)} placeholder="e.g. 5000" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 shadow-inner transition-all" /></div>
                                            <button type="button" onClick={() => removeDiscountRule(idx)} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors w-full lg:w-auto flex justify-center outline-none shadow-sm shrink-0"><Trash2 size={20}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 mt-6 shrink-0">
                                <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">{editMode ? 'Update Group' : 'Create Group'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SETUP INSTALLMENTS MODAL */}
            {showInstallmentModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-7xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0"><h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><CreditCard className="text-orange-400"/> Setup Installments</h3><button onClick={() => setShowInstallmentModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button></div>
                        
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* LEFT COLUMN - EXISTING PLANS */}
                            <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">
                                <h4 className="text-sm font-extrabold text-orange-400 mb-2 uppercase tracking-widest drop-shadow-sm px-2">Existing Plans</h4>
                                {existingInstallments.length > 0 ? (
                                    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                                        {existingInstallments.map(plan => (
                                            <div key={plan.id} className="flex flex-col gap-4 bg-[#0F1523] p-5 rounded-2xl border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] hover:border-orange-500/50 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-orange-500/10 text-orange-400 p-3 rounded-xl border border-orange-500/20">
                                                        <CreditCard size={24} />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-extrabold text-white text-lg drop-shadow-sm">{plan.subjectCount} Subjects</h5>
                                                        <p className="text-xs font-bold text-gray-400 mt-1">{JSON.parse(plan.details).length} Steps Configured</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full">
                                                    <button type="button" onClick={() => handleEditInstallment(plan)} className="flex-1 text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/30 hover:border-blue-500/50 py-2 rounded-xl transition-all outline-none font-bold text-xs flex items-center justify-center gap-2"><Edit3 size={14}/> Edit</button>
                                                    <button type="button" onClick={() => handleDeleteInstallment(plan.id)} className="flex-1 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/30 hover:border-red-500/50 py-2 rounded-xl transition-all outline-none font-bold text-xs flex items-center justify-center gap-2"><Trash2 size={14}/> Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                                        <p className="text-sm font-bold text-gray-500">No installment plans configured.</p>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN - SETUP FORM */}
                            <div className="w-full flex-1">
                                <form onSubmit={handleInstallmentSubmit} className="space-y-6">
                                    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/10 shadow-inner">
                                        <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Trigger Subject Count * (e.g. 3)</label>
                                        <input type="number" name="subjectCount" value={installmentSubjectCount} onChange={(e) => setInstallmentSubjectCount(e.target.value)} placeholder="Number of subjects needed to trigger installment" required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all focus:bg-black/80" />
                                    </div>
                                    
                                    <div className="bg-orange-500/10 p-6 md:p-8 rounded-[2rem] border border-orange-500/20 shadow-inner">
                                        <div className="flex justify-between items-center mb-8">
                                            <h4 className="text-lg font-extrabold text-orange-400 uppercase tracking-widest drop-shadow-sm">Installment Steps</h4>
                                            <button type="button" onClick={addInstallmentStep} className="bg-orange-600/90 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm outline-none border border-transparent"><Plus size={18}/> Add Step</button>
                                        </div>
                                        <div className="space-y-4">
                                            {installmentSteps.map((step, idx) => (
                                                <div key={idx} className="bg-black/50 p-5 rounded-2xl border border-white/10 shadow-sm">
                                                    <div className="flex flex-col sm:flex-row gap-5 items-center mb-4">
                                                        <div className="font-extrabold text-slate-400 w-full sm:w-16 uppercase tracking-wider text-xs">Step {step.step}:</div>
                                                        <div className="flex-1 w-full">
                                                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Amount (Rs) *</label>
                                                            <input type="number" required value={step.amount} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].amount=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all focus:bg-black/80" />
                                                        </div>
                                                        <div className="w-full sm:w-40">
                                                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider" title="Gap from previous payment">Gap (Days) *</label>
                                                            <input type="number" required value={step.gapDays} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].gapDays=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all focus:bg-black/80" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 mt-2 ml-0 sm:ml-20">
                                                        <span className="text-[11px] font-extrabold text-orange-400 uppercase tracking-widest border-b border-orange-500/20 pb-1 w-max">Finance Matrix Mapping (e.g. 1-4)</span>
                                                        <div className="flex flex-wrap gap-4">
                                                            <div className="flex-1 min-w-[120px]">
                                                                <label className="text-[10px] font-bold text-gray-400 mb-1 block">Normal Range</label>
                                                                <input type="text" placeholder="Auto" value={step.rangeNormal || ''} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].rangeNormal=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 shadow-inner transition-all focus:bg-black/80" />
                                                            </div>
                                                            <div className="flex-1 min-w-[120px]">
                                                                <label className="text-[10px] font-bold text-gray-400 mb-1 block">Upgraded after 1 Month</label>
                                                                <input type="text" placeholder="Auto" value={step.rangeUp1 || ''} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].rangeUp1=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 shadow-inner transition-all focus:bg-black/80" />
                                                            </div>
                                                            <div className="flex-1 min-w-[120px]">
                                                                <label className="text-[10px] font-bold text-gray-400 mb-1 block">Upgraded after 2 Months</label>
                                                                <input type="text" placeholder="Auto" value={step.rangeUp2 || ''} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].rangeUp2=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 shadow-inner transition-all focus:bg-black/80" />
                                                            </div>
                                                            {installmentSteps.length > 1 && (
                                                                <div className="flex items-end">
                                                                    <button type="button" onClick={() => removeInstallmentStep(idx)} className="text-red-400 bg-red-500/10 border border-transparent hover:bg-red-500/30 hover:border-red-500/50 p-2.5 rounded-xl transition-all flex justify-center outline-none h-max"><Trash2 size={18}/></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-extrabold py-4 rounded-2xl shadow-[0_5px_20px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-3 outline-none"><Save size={20}/> {editInstallmentId ? 'Update Installment Plan' : 'Save Installment Plan'}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUBJECT MODAL */}
            {showCourseModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-3xl p-5 sm:p-6 md:p-8 w-full max-w-7xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0"><h3 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm">{editMode ? 'Edit Subject' : 'New Subject'}</h3><button onClick={() => setShowCourseModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button></div>
                        <form onSubmit={handleCourseSubmit} className="space-y-6 flex-1">
                            <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
                                <div className="w-full xl:w-[45%] space-y-5">
                                    {(activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl shadow-inner">
                                            <label className="text-xs font-bold text-blue-300 mb-4 block uppercase tracking-widest drop-shadow-sm">Select A/L Streams (Can select multiple) *</label>
                                            <div className="flex flex-wrap gap-4">
                                                {getBatchStreams().map(s => (
                                                    <label key={s} className="flex items-center gap-2 cursor-pointer text-white font-bold bg-black/40 p-3.5 rounded-xl border border-white/10 hover:bg-black/60 shadow-sm transition-colors">
                                                        <input type="checkbox" name="streams" value={s} defaultChecked={editData?.streams?.includes(s) || editData?.stream === s} className="w-4 h-4 accent-blue-500 transition-transform"/> {s}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-5">
                                        <div><label className="text-xs font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Subject Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" /></div>
                                        <div><label className="text-xs font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Subject Code (Optional)</label><input type="text" name="code" defaultValue={editData?.code} className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Start Month</label>
                                                <select name="startMonth" defaultValue={editData?.startMonth || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all cursor-pointer">
                                                    <option value="" className="bg-slate-800 text-white">Select Month</option>
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">End Month</label>
                                                <select name="endMonth" defaultValue={editData?.endMonth || ""} className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all cursor-pointer">
                                                    <option value="" className="bg-slate-800 text-white">Select Month</option>
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div><label className="text-xs font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Description</label><textarea name="description" defaultValue={editData?.description} rows="3" className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 resize-none shadow-inner transition-all"></textarea></div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="flex items-start gap-4 cursor-pointer group bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 hover:bg-orange-500/20 transition-all shadow-sm">
                                            <input type="checkbox" name="isDiscountExcluded" value="true" defaultChecked={editData?.isDiscountExcluded} className="w-6 h-6 accent-orange-500 mt-0.5 shrink-0 transition-transform" />
                                            <div>
                                                <span className="text-sm font-extrabold text-orange-400 group-hover:text-orange-300 transition-colors drop-shadow-sm">Exclude from Bundle Discounts</span>
                                                <p className="text-[11px] text-orange-200/60 mt-1.5 font-bold leading-relaxed">If ticked, this subject will NOT be counted for bundle discounts when students enroll.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="w-full xl:w-[55%] space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-black/40 p-5 rounded-3xl border border-white/5 shadow-inner">
                                        <div>
                                            <label className="text-xs font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Lecturer Name (Optional)</label>
                                            <select name="lecturerName" defaultValue={editData?.lecturerName || ''} onChange={(e) => {
                                                if (editMode) {
                                                    setEditData(prev => ({ ...prev, lecturerName: e.target.value }));
                                                }
                                            }} className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-brand-accent shadow-inner transition-all cursor-pointer">
                                                <option value="" className="bg-slate-800 text-white">Select Lecturer</option>
                                                {editData?.lecturerName && !masterTutes?.some(l => l.name === editData.lecturerName) && (
                                                    <option value={editData.lecturerName} className="bg-slate-800 text-yellow-400">{editData.lecturerName} (Legacy)</option>
                                                )}
                                                {masterTutes?.map((lec, i) => (
                                                    <option key={i} value={lec.name} className="bg-slate-800 text-white">{lec.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Lecturer Image (Optional)</label>
                                            {editMode && editData?.groupPrices && (() => {
                                                try {
                                                    const parsed = typeof editData.groupPrices === 'string' ? JSON.parse(editData.groupPrices) : editData.groupPrices;
                                                    if (parsed?.[0]?.lecturerImage) {
                                                        return <p className="text-[10px] text-green-400 font-bold mb-2 border border-green-500/20 bg-green-500/10 px-3 py-1.5 rounded-lg inline-block drop-shadow-sm">Current: {parsed[0].lecturerImage}</p>;
                                                    }
                                                } catch(e) {}
                                                return null;
                                            })()}
                                            <input type="file" name="lecturerImage" accept="image/*" className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-gray-400 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 cursor-pointer shadow-inner transition-all" />
                                        </div>
                                    </div>

                                    <div className="bg-black/30 p-5 rounded-3xl border border-white/10 shadow-inner">
                                        <h4 className="text-base font-extrabold text-slate-200 mb-4 uppercase tracking-wider drop-shadow-sm">Assign to Groups & Pricing *</h4>
                                        <div className="space-y-4">
                                            {activeBatch?.groups?.length === 0 ? <p className="text-red-400 text-sm font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20 shadow-sm drop-shadow-sm">Create Groups first!</p> : 
                                            activeBatch?.groups?.map(g => (
                                                <div key={g.id} className={`flex flex-col p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${selectedGroupPrices[g.id] !== undefined ? 'bg-blue-500/10 border-blue-500/40' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                                                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
                                                        <label className="flex items-center gap-3 cursor-pointer min-w-[200px] group">
                                                            <input type="checkbox" checked={selectedGroupPrices[g.id] !== undefined} onChange={() => toggleGroupPrice(g.id)} className="hidden" />
                                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedGroupPrices[g.id] !== undefined ? 'bg-blue-500 border-blue-500' : 'border-slate-500 group-hover:border-slate-400'}`}>{selectedGroupPrices[g.id] !== undefined && <CheckCircle size={12} className="text-white"/>}</div>
                                                            <span className="text-sm sm:text-base font-extrabold text-slate-300 group-hover:text-white transition-colors drop-shadow-sm">{g.name}</span>
                                                        </label>
                                                        
                                                        {selectedGroupPrices[g.id] !== undefined && (
                                                            <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200">
                                                                <input type="number" required placeholder={`Price (LKR)`} value={selectedGroupPrices[g.id].price} onChange={(e) => updateGroupData(g.id, 'price', e.target.value)} className="w-full sm:w-1/2 bg-black/60 border border-blue-500/50 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-blue-400 shadow-inner transition-all" />
                                                                
                                                                <label className="flex items-center justify-center gap-2 cursor-pointer bg-orange-500/10 border border-orange-500/30 px-4 py-3 rounded-xl hover:bg-orange-500/20 transition-colors w-full sm:w-1/2 h-full shadow-sm">
                                                                    <input type="checkbox" checked={selectedGroupPrices[g.id].deliverTute} onChange={(e) => updateGroupData(g.id, 'deliverTute', e.target.checked)} className="accent-orange-500 w-4 h-4 transition-transform" />
                                                                    <span className="text-[10px] sm:text-[11px] font-extrabold text-orange-400 uppercase tracking-widest whitespace-nowrap drop-shadow-sm">Deliver Tute</span>
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {selectedGroupPrices[g.id] !== undefined && selectedGroupPrices[g.id].deliverTute && (
                                                        <div className="mt-4 pt-4 border-t border-blue-500/20">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Tutes ({(selectedGroupPrices[g.id].tutes || []).length}/5)</label>
                                                                {(selectedGroupPrices[g.id].tutes || []).length < 5 && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            const currentTutes = selectedGroupPrices[g.id].tutes || [];
                                                                            updateGroupData(g.id, 'tutes', [...currentTutes, { name: '', cover: null }]);
                                                                        }} 
                                                                        className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                                                    >
                                                                        <Plus size={12}/> Add Tute
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            {(selectedGroupPrices[g.id].tutes || []).map((tuteItem, tIndex) => (
                                                                <div key={tIndex} className="bg-black/30 border border-white/5 p-4 rounded-xl mb-3 relative group">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            const currentTutes = [...(selectedGroupPrices[g.id].tutes || [])];
                                                                            currentTutes.splice(tIndex, 1);
                                                                            updateGroupData(g.id, 'tutes', currentTutes);
                                                                            if (tIndex === 0) {
                                                                                const first = currentTutes[0];
                                                                                updateGroupData(g.id, 'tuteName', first ? first.name : '');
                                                                                updateGroupData(g.id, 'tuteCover', first ? first.cover : null);
                                                                            }
                                                                        }} 
                                                                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-md transition-colors opacity-50 group-hover:opacity-100"
                                                                    >
                                                                        <X size={14}/>
                                                                    </button>

                                                                    <select 
                                                                        value={tuteItem.name || ''} 
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const currentTutes = [...(selectedGroupPrices[g.id].tutes || [])];
                                                                            currentTutes[tIndex] = { ...currentTutes[tIndex], name: val };
                                                                            
                                                                            const lecName = editData?.lecturerName || document.querySelector('select[name="lecturerName"]')?.value;
                                                                            const mtd = masterTutes?.find(l => l.name === lecName);
                                                                            if (mtd) {
                                                                                const tuteData = mtd.tutes?.find(t => t.name === val);
                                                                                if (tuteData) {
                                                                                    currentTutes[tIndex].cover = tuteData.image || null;
                                                                                }
                                                                            }
                                                                            updateGroupData(g.id, 'tutes', currentTutes);

                                                                            if (tIndex === 0) {
                                                                                updateGroupData(g.id, 'tuteName', val);
                                                                                updateGroupData(g.id, 'tuteCover', currentTutes[0].cover);
                                                                                if (mtd) updateGroupData(g.id, 'lecturerImage', mtd.image || null);
                                                                            }
                                                                        }}
                                                                        className="w-full bg-black/60 border border-orange-500/30 rounded-xl p-3 pr-10 text-sm text-white font-bold outline-none focus:border-orange-500 shadow-inner transition-all cursor-pointer"
                                                                    >
                                                                        <option value="" disabled className="bg-slate-800 text-slate-400">Select Tute</option>
                                                                        {(() => {
                                                                            const currentVal = tuteItem.name;
                                                                            const currLecName = editData?.lecturerName || document.querySelector('select[name="lecturerName"]')?.value;
                                                                            const lecData = masterTutes?.find(l => l.name === currLecName);
                                                                            
                                                                            const options = [];
                                                                            let hasLegacy = false;

                                                                            if (currentVal && (!lecData || !lecData.tutes?.some(t => t.name === currentVal))) {
                                                                                hasLegacy = true;
                                                                                options.push(<option key="legacy" value={currentVal} className="bg-slate-800 text-yellow-400">{currentVal} (Legacy)</option>);
                                                                            }

                                                                            if (!lecData || !lecData.tutes || lecData.tutes.length === 0) {
                                                                                if (!hasLegacy) options.push(<option key="empty" value="" disabled className="bg-slate-800 text-red-400">No tutes found for selected lecturer</option>);
                                                                            } else {
                                                                                options.push(...lecData.tutes.map((t, idx) => (
                                                                                    <option key={idx} value={t.name} className="bg-slate-800 text-white">{t.name}</option>
                                                                                )));
                                                                            }
                                                                            return options;
                                                                        })()}
                                                                    </select>

                                                                    {tuteItem.name && (
                                                                        <div className="mt-3 flex items-center gap-4">
                                                                            {tuteItem.cover ? (
                                                                                <img 
                                                                                    src={api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api', '')}/storage/documents/${tuteItem.cover}` : `https://imacampus.online/storage/documents/${tuteItem.cover}`} 
                                                                                    onError={(e) => {
                                                                                        if (e.target.src.includes('/storage/documents/')) {
                                                                                            e.target.src = e.target.src.replace('/storage/documents/', '/storage/images/');
                                                                                        } else if (e.target.src.includes('/storage/images/')) {
                                                                                            e.target.src = e.target.src.replace('/storage/images/', '/storage/icons/');
                                                                                        } else {
                                                                                            e.target.onerror = null;
                                                                                            e.target.style.display = 'none';
                                                                                        }
                                                                                    }}
                                                                                    alt="Tute Cover" 
                                                                                    className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg shadow-md border border-orange-500/30 bg-slate-900" 
                                                                                />
                                                                            ) : (
                                                                                <div className="w-16 h-20 sm:w-20 sm:h-24 bg-slate-800/80 rounded-lg flex flex-col items-center justify-center border border-dashed border-orange-500/30">
                                                                                    <span className="text-[8px] text-slate-400 font-bold tracking-wider">NO COVER</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-0.5">Tute {tIndex + 1}</p>
                                                                                <p className="text-sm font-bold text-white truncate">{tuteItem.name}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            
                                                            {(selectedGroupPrices[g.id].tutes || []).length === 0 && (
                                                                <div className="p-4 border border-dashed border-slate-600 rounded-xl text-center">
                                                                    <p className="text-xs text-slate-400 font-bold mb-2">No tutes allocated yet.</p>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            updateGroupData(g.id, 'tutes', [{ name: '', cover: null }]);
                                                                        }} 
                                                                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                                                                    >
                                                                        <Plus size={14}/> Add First Tute
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/10 mt-6 shrink-0">
                                <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-3.5 text-base sm:text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.01] uppercase tracking-wide outline-none border border-transparent">
                                    {editMode ? 'Update Subject' : 'Save Subject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD/EDIT FOLDER MODAL */}
            {showLessonGroupModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-8 w-full max-w-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-2xl font-extrabold text-white drop-shadow-sm flex items-center gap-2.5">
                                    <FolderOpen className={selectedFolderParentId ? "text-indigo-400" : "text-brand-accent"} size={26} />
                                    {editMode ? (selectedFolderParentId ? 'Edit Sub-folder' : 'Edit Folder') : (selectedFolderParentId ? 'New Sub-folder' : 'New Folder')}
                                </h3>
                                {selectedFolderParentId && (
                                    <p className="text-xs text-indigo-400 font-semibold mt-1">
                                        Inside: <span className="font-bold underline">{lessonGroups.find(g => String(g.id) === String(selectedFolderParentId))?.title || 'Selected Main Folder'}</span>
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setShowLessonGroupModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleLessonGroupSubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">
                                    Folder Location / Parent Folder
                                </label>
                                <select 
                                    name="parentId" 
                                    value={selectedFolderParentId ? String(selectedFolderParentId) : ''} 
                                    onChange={(e) => setSelectedFolderParentId(e.target.value)} 
                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900 text-white font-bold">
                                        📁 Root Folder (Main Level)
                                    </option>
                                    {lessonGroups
                                        .filter(g => parseInt(g.type) === getTypeInt(contentType || 'recording') && !g.parentId && (!editData || g.id !== editData.id))
                                        .map(root => (
                                            <option key={root.id} value={String(root.id)} className="bg-slate-900 text-indigo-300 font-semibold">
                                                ↳ 📂 Inside Sub-folder of: {root.title || root.name}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Select a parent folder above to place this as a Sub-folder, or choose "Root Folder" for a top-level folder.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">
                                    {selectedFolderParentId ? 'Sub-folder Title *' : 'Folder Title *'}
                                </label>
                                <input type="text" name="title" defaultValue={editData?.title || editData?.name} placeholder={selectedFolderParentId ? "e.g. Unit 01 Discussions" : "e.g. June Theory"} required className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Display Order</label>
                                <input type="number" name="order" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Share with other Batches (Optional)</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-3 bg-black/40 border border-white/5 rounded-xl">
                                    {batches.filter(b => b.id !== activeBatch?.id).map(b => (
                                        <label key={`share-folder-b-${b.id}`} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedBatchesForContent.includes(b.id) ? 'bg-brand-accent border-brand-accent' : 'border-slate-500'}`}>
                                                {selectedBatchesForContent.includes(b.id) && <CheckCircle size={12} className="text-white"/>}
                                            </div>
                                            <span className="text-sm text-gray-300">{b.name}</span>
                                            <input type="checkbox" className="hidden" checked={selectedBatchesForContent.includes(b.id)} 
                                                onChange={(e) => {
                                                    if(e.target.checked) setSelectedBatchesForContent([...selectedBatchesForContent, b.id]);
                                                    else setSelectedBatchesForContent(selectedBatchesForContent.filter(id => id !== b.id));
                                                }}
                                            />
                                        </label>
                                    ))}
                                    {batches.filter(b => b.id !== activeBatch?.id).length === 0 && <span className="text-xs text-gray-500">No other batches available</span>}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">
                                {editMode ? (selectedFolderParentId ? 'Update Sub-folder' : 'Update Folder') : (selectedFolderParentId ? 'Create Sub-folder' : 'Create Folder')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* LECTURER MODAL */}
            {showLecturerModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] p-8 w-full max-w-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white drop-shadow-sm">{editMode ? 'Edit Lecturer' : 'New Lecturer'}</h3>
                            <button type="button" onClick={() => setShowLecturerModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleLecturerSubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Lecturer Name *</label>
                                <input type="text" name="name" defaultValue={editData?.name} required placeholder="e.g. Dr. Kamal" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Phone Number (Optional)</label>
                                <input type="text" name="phone" defaultValue={editData?.phone} placeholder="e.g. 0712345678" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/80 shadow-inner transition-all" />
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">
                                {editMode ? 'Update Lecturer' : 'Add Lecturer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL */}
            {previewData && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#090E17]/95 border border-white/10 rounded-[2rem] w-full max-w-7xl h-[85vh] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl">
                        <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><MonitorPlay size={28} className="text-blue-400"/> {previewData.title}</h3>
                            <div className="flex gap-3">
                                <a href={previewData.fileName ? `${getBaseUrl()}/storage/documents/${previewData.fileName}` : previewData.link} target="_blank" rel="noreferrer" className="bg-brand-accent/90 hover:bg-brand-accent text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent">
                                    <ExternalLink size={18}/> Open External
                                </a>
                                <button onClick={() => setPreviewData(null)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 p-2.5 rounded-xl transition-all shadow-sm outline-none"><X size={20}/></button>
                            </div>
                        </div>
                        <div className="flex-1 bg-black/40 p-6 relative flex items-center justify-center shadow-inner">
                            {previewData.fileName ? (
                                <iframe src={`${getBaseUrl()}/storage/documents/${previewData.fileName}`} className="w-full h-full rounded-2xl bg-white shadow-inner border border-white/10" title="Document Preview" />
                            ) : previewData.link ? (
                                <iframe src={getEmbedUrl(previewData.link)} className="w-full h-full rounded-2xl bg-black border border-white/10 shadow-inner" title="Video/Live Preview" allowFullScreen />
                            ) : (
                                <div className="text-center text-slate-500"><Ban size={64} className="mx-auto mb-4 opacity-40"/><p className="text-xl font-bold">No preview available.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return createPortal(modalContent, document.body);
}