import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, Clock, Play, Lock, CheckCircle2, 
    FileText, Video, X, BookOpen, AlertTriangle, Plus, Check, Building2, ChevronRight,
    MonitorPlay, Loader2, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function StaffTaskCenter({ loggedInUser }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('in_progress');
    const [tasks, setTasks] = useState([]);
    
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showContentModal, setShowContentModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { fetchTasks(); }, [activeTab]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            let url = `/admin/tasks?assignedTo=${loggedInUser.id}&role=COORDINATOR&`;
            if (activeTab === 'my_tasks') url += `status=PENDING&`;
            else if (activeTab === 'in_progress') url += `status=IN_PROGRESS&`;
            else if (activeTab === 'completed') url += `status=COMPLETED&`;

            const res = await api.get(url);
            const sorted = (res.data || []).sort((a,b) => {
                if(!a.deadline) return 1; if(!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });
            setTasks(sorted);
        } catch (e) { toast.error("Failed to load tasks"); } finally { setLoading(false); }
    };

    const handleRequestUnlock = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/tasks/request-unlock', { taskId: selectedTask.id, reason: new FormData(e.target).get('reason') });
            toast.success("Unlock request sent to manager!");
            setSelectedTask(null); setShowUnlockModal(false); fetchTasks();
        } catch (e) { toast.error("Failed to request unlock"); }
    };

    const getTaskDetails = (task) => {
        if (task.taskType === 'CUSTOM') return { icon: CheckSquare, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-500/10', border: 'border-pink-200 dark:border-pink-500/20', label: task.customTitle || 'Custom Task' };
        switch(task.taskType) {
            case 'LIVE_LINK': return { icon: Play, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', label: 'Upload Live Link' };
            case 'TECH_DELIVERABLES': return { icon: MonitorPlay, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', label: 'Technical Deliverables' };
            case 'RECORDING': return { icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', label: 'Upload Recording' };
            case 'NOTES': return { icon: FileText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', label: 'Upload Document' };
            case 'MCQ': return { icon: FileText, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', label: 'Upload MCQ Paper' };
            case 'STRUCTURED_PAPER': return { icon: FileText, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20', label: 'Upload Structured Paper' };
            default: return { icon: CheckSquare, color: 'text-gray-600 dark:text-slate-400', bg: 'bg-gray-100 dark:bg-slate-800', border: 'border-gray-200 dark:border-slate-700', label: task.taskType.replace('_', ' ') };
        }
    };

    const formatTimeOnly = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'No Deadline';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getCountdownText = (deadlineStr) => {
        if (!deadlineStr) return '';
        const diff = new Date(deadlineStr) - now;
        if (diff <= 0) return 'Overdue';
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (d > 0) return `${d}d ${h}h left`;
        if (h > 0) return `${h}h ${m}m left`;
        return `${m}m left`;
    };

    return (
        <div className="w-full min-h-screen text-gray-900 dark:text-slate-200 font-sans pb-10 bg-gray-50 dark:bg-transparent animate-in fade-in duration-500 relative transition-colors">
            
            {/* Header */}
            <div className="mb-8 bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl border border-gray-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors">
                
                <div className="flex items-center gap-5 z-10">
                    <div className="p-3.5 bg-brand-accentLight/50 dark:bg-brand-accent/10 rounded-2xl border border-brand-accent/20 text-brand-accent shadow-sm transition-colors">
                        <Clock size={26} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-wide transition-colors">My Work Space</h2>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium transition-colors">Manage and execute your daily tasks</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto bg-gray-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto z-10 transition-colors">
                    <button onClick={() => setActiveTab('in_progress')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 outline-none ${activeTab === 'in_progress' ? 'bg-brand-accent text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                        In Progress
                    </button>
                    <button onClick={() => setActiveTab('my_tasks')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 outline-none ${activeTab === 'my_tasks' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                        Action Required
                    </button>
                    <button onClick={() => setActiveTab('completed')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 outline-none ${activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                        Completed
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                {loading ? (
                    <div className="text-center py-24 text-brand-accent font-bold text-sm flex flex-col items-center transition-colors">
                        <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin mb-4 transition-colors"></div>
                        Syncing Timeline...
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-16 rounded-[2.5rem] text-center flex flex-col items-center justify-center mt-8 shadow-sm transition-colors">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-full mb-6 border border-emerald-200 dark:border-emerald-500/20 transition-colors"><CheckCircle2 size={48} className="text-emerald-600 dark:text-emerald-400" /></div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">Timeline Clear!</h3>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm max-w-sm transition-colors">Awesome job! You have no tasks pending in this category at the moment.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 dark:border-slate-800 ml-4 md:ml-12 space-y-10 pb-12 pt-6 transition-colors">
                        {tasks.map((task) => {
                            const details = getTaskDetails(task);
                            const TaskIcon = details.icon;
                            const isMainTaskWithSubs = task.subTasks && task.subTasks.length > 0;

                            return (
                                <div key={task.id} className="relative pl-8 md:pl-12 group">
                                    
                                    {/* TIMELINE GLOW DOT */}
                                    <div className={`absolute -left-[11px] top-6 w-5 h-5 rounded-full border-4 border-gray-50 dark:border-slate-950 z-10 transition-colors shadow-sm ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900' : task.isOverdue ? 'bg-red-500 animate-pulse border-red-100 dark:border-red-900' : 'bg-brand-accent border-brand-accentLight dark:border-slate-800'}`}></div>

                                    {/* TIME BADGE & COUNTDOWN */}
                                    <div className="mb-3 pl-1 flex items-center flex-wrap gap-3 transition-colors">
                                        <span className={`text-xl font-black tracking-tight transition-colors ${task.isOverdue && task.status !== 'COMPLETED' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{formatTimeOnly(task.deadline)}</span>
                                        <span className="bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest border border-gray-200 dark:border-slate-700 transition-colors">{formatDateOnly(task.deadline)}</span>
                                        
                                        {task.status !== 'COMPLETED' && task.deadline && new Date(task.deadline) > now && (
                                            <span className="bg-brand-accentLight/50 dark:bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors">
                                                <Clock size={12} className="animate-pulse" /> {getCountdownText(task.deadline)}
                                            </span>
                                        )}
                                        {task.status !== 'COMPLETED' && task.deadline && new Date(task.deadline) <= now && (
                                            <span className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors">
                                                <AlertTriangle size={12} /> LATE
                                            </span>
                                        )}
                                    </div>

                                    {/* TASK CARD */}
                                    <div className={`bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl border p-6 md:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 ${task.isOverdue && task.status !== 'COMPLETED' ? 'border-red-300 dark:border-red-500/30 hover:border-red-400 dark:hover:border-red-500/50' : 'border-gray-200 dark:border-slate-800 hover:border-brand-accent/30 dark:hover:border-brand-accent/30'}`}>
                                        
                                        <div className="flex items-start gap-5 flex-1 min-w-0 w-full transition-colors">
                                            <div className={`p-3.5 rounded-2xl ${details.bg} border ${details.border} shrink-0 shadow-sm transition-colors`}>
                                                <TaskIcon className={details.color} size={24} strokeWidth={2.5} />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 pt-1 transition-colors">
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 leading-tight transition-colors">{details.label}</h4>
                                                {task.taskType !== 'CUSTOM' ? (
                                                    <p className="text-sm text-brand-accent font-bold truncate mb-3 transition-colors">{task.timetable?.subjectName} <span className="text-gray-400 dark:text-slate-600 font-normal mx-1">|</span> <span className="text-gray-700 dark:text-slate-300 font-medium transition-colors">{task.timetable?.title}</span></p>
                                                ) : (
                                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed transition-colors">{task.customDesc}</p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest transition-colors">
                                                    <span className="bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm transition-colors"><Building2 size={12} className="text-gray-400 dark:text-slate-500"/> {task.business?.name}</span>
                                                    <span className="bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm transition-colors"><BookOpen size={12} className="text-gray-400 dark:text-slate-500"/> {task.batch?.name}</span>
                                                </div>

                                                {isMainTaskWithSubs && (
                                                    <div className="mt-5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase font-black tracking-widest mb-3 pl-1 transition-colors">Checklist Items</p>
                                                        <div className="space-y-2">
                                                            {task.subTasks.map(sub => (
                                                                <div key={sub.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl text-xs border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                                                                    <span className={sub.status === 'COMPLETED' ? 'line-through text-gray-400 dark:text-slate-500 font-medium transition-colors' : 'text-gray-800 dark:text-slate-200 font-bold transition-colors'}>{sub.customTitle}</span>
                                                                    {sub.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-emerald-500 transition-colors"/> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 transition-colors"></div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3 transition-colors">
                                            {(activeTab === 'my_tasks' || activeTab === 'in_progress') && (
                                                task.status === 'LOCKED' || task.isOverdue ? (
                                                    <button onClick={() => { setSelectedTask(task); setShowUnlockModal(true); }} className="w-full md:w-44 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border border-red-200 dark:border-red-500/20 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm outline-none">
                                                        <Lock size={16} /> Req Unlock
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setSelectedTask(task); setShowContentModal(true); }} className="w-full md:w-44 bg-brand-accent hover:bg-brand-accentHover text-white py-3.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)] hover:-translate-y-0.5 outline-none border border-transparent">
                                                        <Play size={16} fill="currentColor" /> Execute Task
                                                    </button>
                                                )
                                            )}
                                            {task.status === 'COMPLETED' && (
                                                <div className="w-full md:w-44 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-500/20 text-xs uppercase tracking-widest shadow-sm transition-colors">
                                                    <CheckCircle2 size={16} /> Completed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Request Unlock Modal */}
            {showUnlockModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 transition-colors">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative transition-colors">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-slate-800 pb-4 transition-colors">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors"><Lock className="text-red-500 dark:text-red-400" size={20}/> Task Locked</h3>
                            <button onClick={() => setShowUnlockModal(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-slate-800 p-2 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 outline-none"><X size={18}/></button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-6 leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm font-medium transition-colors">
                            This task is overdue and locked. You must submit a request to your manager to unlock it.
                        </p>
                        <form onSubmit={handleRequestUnlock}>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-colors">Reason for Delay *</label>
                            <textarea name="reason" required rows="3" placeholder="Explain why the task was delayed..." className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500 dark:focus:border-red-500 mb-6 transition-colors resize-none shadow-sm placeholder-gray-400 dark:placeholder-slate-500"></textarea>
                            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-transform hover:scale-[1.02] text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md outline-none">
                                <AlertTriangle size={18}/> Send Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Execution Modal */}
            {showContentModal && selectedTask && (
                <TaskExecutionModal task={selectedTask} onClose={() => setShowContentModal(false)} onComplete={() => { setShowContentModal(false); fetchTasks(); }} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CONTENT HUB EXECUTION MODAL (Compact UI & 500 Error Fixes)
// ---------------------------------------------------------------------------
const TaskExecutionModal = ({ task, onClose, onComplete }) => {
    const [submitting, setSubmitting] = useState(false);
    const isCustom = task.taskType === 'CUSTOM';
    const isTechDeliverables = task.taskType === 'TECH_DELIVERABLES';
    
    const [batches, setBatches] = useState([]);
    const [lessonGroups, setLessonGroups] = useState([]);
    const [existingContents, setExistingContents] = useState([]); 
    const [massAssignSubjects, setMassAssignSubjects] = useState([]);
    const [selectedBatchesForContent, setSelectedBatchesForContent] = useState([]);
    const [activeCourseCode, setActiveCourseCode] = useState(null); 

    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('');

    const [isVerification, setIsVerification] = useState(false); 
    const [selectedExistingContent, setSelectedExistingContent] = useState(null);

    // Map Task types to Content Hub types
    const typeMap = { 'LIVE_LINK': 'live', 'TECH_DELIVERABLES': 'live', 'RECORDING': 'recording', 'NOTES': 'document', 'MCQ': 'paper', 'STRUCTURED_PAPER': 'sPaper' };
    const contentType = isCustom || isTechDeliverables ? '' : typeMap[task.taskType];

    const getTypeInt = (typeStr) => {
        switch (typeStr) {
            case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5;
            default: return 1;
        }
    };

    const getBaseUrl = () => {
        let url = api.defaults.baseURL || 'https://imacampus.online/api';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    useEffect(() => { if (!isCustom && !isTechDeliverables) fetchHubData(); }, [task]);

    const fetchHubData = async () => {
        try {
            const res = await api.get(`/admin/batches/${task.businessId}`);
            const fetchedBatches = res.data.batches || res.data || [];
            setBatches(fetchedBatches);
            if (task.batchId) setSelectedBatchesForContent([task.batchId]);

            let foundCourseId = 0;
            let foundCode = null;

            if (task.timetable?.subjectName && task.batchId) {
                const batchData = fetchedBatches.find(b => b.id === task.batchId);
                if (batchData) {
                    batchData.groups?.forEach(g => {
                        g.courses?.forEach(c => {
                            if (c.name === task.timetable.subjectName) {
                                setMassAssignSubjects(prev => !prev.includes(c.id) ? [...prev, c.id] : prev);
                                foundCode = c.code || `SUB_${c.id}`;
                                foundCourseId = c.id; 
                            }
                        });
                    });
                    if (foundCode) setActiveCourseCode(foundCode); 
                }
            }

            if (task.batchId) {
                const lgRes = await api.get(`/admin/manager/get-contents?batchId=${task.batchId}&courseCode=${foundCode || 'null'}&courseId=${foundCourseId}`);
                const targetTypeInt = getTypeInt(contentType);
                const allFolders = lgRes.data?.lessonGroups || [];
                setLessonGroups(allFolders.filter(f => parseInt(f.type) === targetTypeInt));
                setExistingContents(lgRes.data?.contents || []);
            }
        } catch (e) { console.error("Error loading hub data", e); }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const payload = { title: newFolderName, type: getTypeInt(contentType), order: 1, batch_id: task.batchId, course_code: activeCourseCode };
            const res = await api.post('/admin/manager/content-group/add', payload);
            toast.success("Folder Created!");
            if(res.data?.data) { setLessonGroups([...lessonGroups, res.data.data]); setSelectedFolder(res.data.data.id); }
            setIsCreatingFolder(false); setNewFolderName('');
        } catch (e) { toast.error("Failed to create folder"); }
    };

    const toggleMassAssignSubject = (subId) => setMassAssignSubjects(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.target);
        
        // 🔥 FIX 1: Aggressive Cleanup to prevent 500 Errors 🔥
        // Remove empty files that crash Multer on the backend
        ['file', 'thumbnail', 'proof'].forEach(field => {
            const f = formData.get(field);
            if (f && (f.size === 0 || !f.name)) {
                formData.delete(field);
            }
        });

        // Remove empty strings for optional fields to prevent parsing errors
        ['zoomMeetingId', 'startTime', 'endTime'].forEach(field => {
            if (!formData.get(field)) formData.delete(field);
        });

        try {
            if (isCustom) {
                formData.append('taskId', task.id);
                await api.post('/admin/tasks/complete-custom', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            } else if (isTechDeliverables) {
                formData.append('taskId', task.id);
                await api.post('/admin/tasks/complete-technical-deliverables', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            } else if (isVerification) {
                if (!selectedExistingContent) { toast.error("Please select a content to verify!"); setSubmitting(false); return; }
                await api.post('/admin/tasks/complete', { taskId: task.id, contentId: selectedExistingContent });
            } else {
                if (massAssignSubjects.length === 0) { toast.error("Please select at least one subject!"); setSubmitting(false); return; }
                
                formData.set('type', contentType);
                formData.set('batch_id', task.batchId);
                
                if (selectedFolder) formData.set('contentGroupId', selectedFolder); 
                else formData.delete('contentGroupId'); // Prevent NaN errors on backend
                
                formData.set('selectedCourses', JSON.stringify(massAssignSubjects));
                formData.set('isFree', formData.get('isFree') ? '1' : '0'); 
                
                const contentRes = await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
                await api.post('/admin/tasks/complete', { taskId: task.id, contentId: contentRes.data?.data?.id });
            }
            toast.success("Task Executed & Content Published!");
            onComplete();
        } catch (error) { 
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to execute task."); 
        } finally { setSubmitting(false); }
    };

    // ----- CUSTOM TASK VIEW -----
    if (isCustom) {
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 transition-colors">
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-[2rem] w-full max-w-md shadow-2xl p-8 transition-colors">
                    <div className="flex justify-between items-center mb-6 transition-colors border-b border-gray-200 dark:border-slate-800 pb-4">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors"><CheckCircle2 className="text-brand-accent"/> Custom Task</h3>
                        <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 outline-none transition-colors"><X size={18}/></button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-6 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm font-medium transition-colors leading-relaxed">{task.customDesc}</p>
                    <form onSubmit={handleSubmit}>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block tracking-widest transition-colors">Upload Proof</label>
                        <input type="file" name="proof" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-gray-600 dark:text-slate-300 mb-8 cursor-pointer shadow-sm file:bg-brand-accent file:text-white file:border-0 file:rounded-xl file:px-4 file:py-2.5 file:mr-4 file:font-bold transition-colors" />
                        <button type="submit" disabled={submitting} className="w-full bg-brand-accent hover:bg-brand-accentHover text-white font-black py-4 rounded-2xl transition-all disabled:opacity-70 text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 outline-none">
                            {submitting ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>}
                            {submitting ? 'EXECUTING...' : 'COMPLETE TASK'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ----- TECH DELIVERABLES VIEW -----
    if (isTechDeliverables) {
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 transition-colors">
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-[2rem] w-full max-w-md shadow-2xl p-8 transition-colors">
                    <div className="flex justify-between items-center mb-6 transition-colors border-b border-gray-200 dark:border-slate-800 pb-4">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors"><MonitorPlay className="text-brand-accent"/> Technical Deliverables</h3>
                        <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 outline-none transition-colors"><X size={18}/></button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-6 bg-gray-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-gray-200 dark:border-slate-700/50 shadow-sm font-medium transition-colors leading-relaxed">Submit the live link, attachments, and notes to the Technical Department.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block tracking-widest transition-colors">Live Link (URL)</label>
                            <input type="url" name="liveLink" placeholder="https://..." required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-blue-600 dark:text-blue-400 font-bold outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block tracking-widest transition-colors">Attachment (PDF/Image)</label>
                            <input type="file" name="attachment" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-gray-600 dark:text-slate-300 cursor-pointer shadow-sm file:bg-brand-accent file:text-white file:border-0 file:rounded-xl file:px-4 file:py-2 file:mr-4 file:font-bold transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block tracking-widest transition-colors">Notes (Optional)</label>
                            <textarea name="notes" rows="3" placeholder="Any additional notes for the tech team..." className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors resize-none shadow-sm placeholder-gray-400 dark:placeholder-slate-500"></textarea>
                        </div>
                        <div className="pt-4">
                            <button type="submit" disabled={submitting} className="w-full bg-brand-accent hover:bg-brand-accentHover text-white font-black py-4 rounded-2xl transition-all disabled:opacity-70 text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 outline-none">
                                {submitting ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>}
                                {submitting ? 'EXECUTING...' : 'SUBMIT DELIVERABLES'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }


    const filteredExistingContents = existingContents.filter(c => String(c.contentType) === String(getTypeInt(contentType)) || c.contentType === contentType);

    // ----- MAIN CONTENT HUB VIEW -----
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 transition-colors">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[2rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
                
                {/* Modal Header */}
                <div className="p-5 md:px-8 md:py-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/30 shrink-0 transition-colors">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors tracking-tight"><MonitorPlay size={24} className="text-brand-accent"/> Publish {task.taskType.replace('_', ' ')}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-bold transition-colors uppercase tracking-wider">{task.timetable?.subjectName} <span className="text-brand-accent mx-1">•</span> {task.timetable?.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl transition-colors outline-none shadow-sm"><X size={20}/></button>
                </div>
                
                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar transition-colors bg-white dark:bg-slate-900">
                    
                    {/* Tab Switcher */}
                    <div className="flex gap-2 bg-gray-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 w-max transition-colors">
                        <button type="button" onClick={() => setIsVerification(false)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all outline-none ${!isVerification ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700'}`}>Create New</button>
                        <button type="button" onClick={() => setIsVerification(true)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all outline-none ${isVerification ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700'}`}>Verify Existing</button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col h-full transition-colors">
                        
                        {isVerification ? (
                            // VERIFY EXISTING TAB
                            <div className="flex flex-col flex-1 h-full">
                                <div className="bg-gray-50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 shadow-sm transition-colors flex-1 flex flex-col min-h-0">
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-4 transition-colors">Verify Previously Uploaded Content</h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                                        {filteredExistingContents.length === 0 ? (
                                            <div className="col-span-full flex items-center justify-center border border-gray-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm transition-colors">
                                                <p className="text-sm text-gray-500 dark:text-slate-500 font-medium text-center">No {task.taskType.replace('_', ' ')} found in the Hub for this subject.</p>
                                            </div>
                                        ) : (
                                            filteredExistingContents.map(c => (
                                                <div key={c.id} onClick={() => setSelectedExistingContent(c.id)} className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm group flex flex-col justify-between ${selectedExistingContent === c.id ? 'bg-brand-accentLight/20 dark:bg-brand-accent/10 border-brand-accent/50 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md'}`}>
                                                    <div className="flex justify-between items-start outline-none">
                                                        <div className="pr-3 min-w-0 transition-colors">
                                                            <p className={`font-bold text-sm truncate mb-1.5 transition-colors ${selectedExistingContent === c.id ? 'text-brand-accent' : 'text-gray-900 dark:text-white group-hover:text-brand-accent'}`}>{c.title}</p>
                                                            <p className="text-[10px] text-gray-500 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">{new Date(c.createdAt).toDateString()}</p>
                                                        </div>
                                                        {selectedExistingContent === c.id ? <CheckCircle2 className="text-brand-accent shrink-0 transition-colors" size={20}/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 shrink-0 transition-colors"></div>}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 transition-colors">
                                                        {c.link && (
                                                            <a href={c.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] flex items-center gap-1 font-bold uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                                                                <ExternalLink size={12}/> View Link
                                                            </a>
                                                        )}
                                                        {c.fileName && (
                                                            <a href={`${getBaseUrl()}/storage/documents/${c.fileName}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] flex items-center gap-1 font-bold uppercase tracking-widest bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors">
                                                                <FileText size={12}/> View File
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // CREATE NEW TAB (Side-by-Side Compact Layout)
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-colors">
                                
                                {/* LEFT COLUMN: Primary Data */}
                                <div className="lg:col-span-7 bg-gray-50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 shadow-sm transition-colors h-fit space-y-5">
                                    <h4 className="text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 border-b border-gray-200 dark:border-slate-700 pb-2 transition-colors">Primary Content Data</h4>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 transition-colors">
                                        <div className="flex-[3]">
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Title *</label>
                                            <input type="text" name="title" defaultValue={task.timetable?.title} required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Order</label>
                                            <input type="number" name="itemOrder" defaultValue={1} required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm text-center shadow-sm transition-colors" />
                                        </div>
                                    </div>

                                    {(contentType === 'live' || contentType === 'recording') && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">URL Link *</label>
                                            <input type="url" name="link" required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-blue-600 dark:text-blue-400 font-bold outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" />
                                        </div>
                                    )}

                                    {contentType === 'recording' && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Meeting ID</label>
                                            <input type="text" name="zoomMeetingId" className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" />
                                        </div>
                                    )}

                                    {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Main File *</label>
                                            <input type="file" name="file" required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-600 dark:text-slate-400 file:bg-gray-100 dark:file:bg-slate-700 file:text-gray-900 dark:file:text-white file:font-bold file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3 text-sm cursor-pointer shadow-sm transition-colors" />
                                        </div>
                                    )}
                                    
                                    {(contentType === 'live' || contentType === 'recording') && (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Custom Thumbnail (Optional)</label>
                                            <input type="file" name="thumbnail" accept="image/*" className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-600 dark:text-slate-400 file:bg-gray-100 dark:file:bg-slate-700 file:text-gray-900 dark:file:text-white file:font-bold file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3 text-sm cursor-pointer shadow-sm transition-colors" />
                                        </div>
                                    )}

                                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4 flex flex-col sm:flex-row gap-4 transition-colors">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Date</label>
                                            <input type={(contentType==='document'||contentType==='sPaper'||contentType==='paper') ? "month":"date"} name="date" defaultValue={task.timetable?.date?.split('T')[0]} required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm [color-scheme:light] dark:[color-scheme:dark] shadow-sm transition-colors" />
                                        </div>
                                        {contentType === 'live' && (
                                            <>
                                                <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Start Time</label><input type="time" name="startTime" defaultValue={task.timetable?.startTime} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                                <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">End Time</label><input type="time" name="endTime" defaultValue={task.timetable?.endTime} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                            </>
                                        )}
                                        {contentType === 'paper' && (
                                            <>
                                                <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Time (Min) *</label><input type="number" name="paperTime" required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                                <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Questions *</label><input type="number" name="questionCount" required className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className="pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer w-full sm:w-max group bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all shadow-sm">
                                            <input type="checkbox" name="isFree" value="1" className="w-4 h-4 accent-brand-accent rounded cursor-pointer border-gray-300 dark:border-slate-600"/>
                                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Mark as Free Content (Open for all)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Folder & Subjects */}
                                <div className="lg:col-span-5 flex flex-col gap-6">
                                    <div className="bg-gray-50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 shadow-sm transition-colors h-fit">
                                        <h4 className="text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 transition-colors">Destination Details</h4>
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5 block tracking-widest transition-colors">Folder Path</label>
                                        <div className="flex gap-2 transition-colors">
                                            {isCreatingFolder ? (
                                                <div className="flex w-full gap-2 transition-colors"><input type="text" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Folder Name..." className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /><button type="button" onClick={handleCreateFolder} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-4 rounded-xl hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-all shadow-sm outline-none"><CheckCircle2 size={18}/></button><button type="button" onClick={()=>setIsCreatingFolder(false)} className="bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 px-4 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm outline-none"><X size={18}/></button></div>
                                            ) : (
                                                <><select value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)} className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm cursor-pointer shadow-sm transition-colors"><option value="" className="bg-white dark:bg-slate-800">Uncategorized</option>{lessonGroups.map(f => <option key={f.id} value={f.id} className="bg-white dark:bg-slate-800">{f.title || f.name}</option>)}</select><button type="button" onClick={()=>setIsCreatingFolder(true)} className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 shadow-sm flex items-center gap-1.5 outline-none"><Plus size={14}/> New Folder</button></>
                                            )}
                                        </div>
                                    </div>

                                    {/* Student Access is now fully integrated into the right column layout */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-gray-200 dark:border-slate-700 shadow-sm transition-colors flex-1 flex flex-col min-h-[250px]">
                                        <h4 className="text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 transition-colors">Student Access (Subjects)</h4>
                                        <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                                            {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                                <div key={selectedBatch.id}>
                                                    {selectedBatch.groups?.map((group, gIdx) => (
                                                        <div key={gIdx} className="mb-5 last:mb-0 transition-colors">
                                                            <p className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2.5 transition-colors">{group.name}</p>
                                                            <div className="grid grid-cols-2 gap-2.5 transition-colors">
                                                                {group.courses?.map((course, cIdx) => (
                                                                    <label key={cIdx} className={`flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-[10px] font-bold transition-all shadow-sm ${massAssignSubjects.includes(course.id) ? 'bg-brand-accentLight/50 dark:bg-brand-accent/20 border-brand-accent/50 text-brand-accent dark:text-brand-accent' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'}`}>
                                                                        <input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="w-3.5 h-3.5 accent-brand-accent rounded border-gray-300 dark:border-slate-600" />
                                                                        <span className="truncate">{course.name}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-6 pt-5 border-t border-gray-200 dark:border-slate-800 shrink-0 transition-colors">
                            <button type="submit" disabled={submitting} className="w-full bg-brand-accent hover:bg-brand-accentHover text-white font-black py-4 rounded-xl transition-all disabled:opacity-70 text-sm md:text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)] outline-none">
                                {submitting ? <Loader2 className="animate-spin" size={20}/> : (isVerification ? <CheckCircle2 size={20}/> : <MonitorPlay size={20}/>)}
                                {submitting ? 'PROCESSING...' : (isVerification ? 'VERIFY & COMPLETE TASK' : 'PUBLISH & COMPLETE TASK')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};