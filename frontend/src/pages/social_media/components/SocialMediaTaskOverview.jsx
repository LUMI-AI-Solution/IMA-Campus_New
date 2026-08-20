import React, { useState } from 'react';
import { 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Calendar,
    ChevronRight,
    UserCircle,
    LayoutList,
    Unlock,
    Send,
    Tag,
    X,
    Activity,
    Sparkles,
    SlidersHorizontal,
    Layers,
    ShieldAlert
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_STAFF = [
    { id: 1, name: 'Amila Perera', role: 'Graphic Designer', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, name: 'Kasun Silva', role: 'Video Editor', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, name: 'Nimesha Fernando', role: 'Content Writer', avatar: 'https://i.pravatar.cc/150?u=3' }
];

const MOCK_INBOX_TASKS = [
    { id: 101, title: '2027 A/L Flyer Design', requestedBy: 'Nimal (Art Coord)', date: 'Oct 12, 2026', type: 'Design', priority: 'High' },
    { id: 102, title: 'Seminar Promo Video', requestedBy: 'Kamal (Tech Coord)', date: 'Oct 13, 2026', type: 'Video', priority: 'Medium' },
    { id: 103, title: 'Facebook Ad Copy', requestedBy: 'Saman (Commerce Coord)', date: 'Oct 14, 2026', type: 'Content', priority: 'Low' }
];

const MOCK_ACTIVE_TASKS = [
    { id: 201, title: 'October Intake Post', assignee: MOCK_STAFF[0], status: 'assigned', deadline: '2026-10-20', locked: false },
    { id: 202, title: 'Student Testimonial Edit', assignee: MOCK_STAFF[1], status: 'in_progress', deadline: '2026-10-18', locked: false },
    { id: 203, title: 'Monthly Highlights Reels', assignee: MOCK_STAFF[1], status: 'delayed', deadline: '2026-10-10', locked: true },
    { id: 204, title: 'Blog Post Draft', assignee: MOCK_STAFF[2], status: 'review', deadline: '2026-10-15', locked: false },
];

export default function SocialMediaTaskOverview() {
    const [inboxTasks, setInboxTasks] = useState(MOCK_INBOX_TASKS);
    const [activeTasks, setActiveTasks] = useState(MOCK_ACTIVE_TASKS);
    const [selectedTask, setSelectedTask] = useState(null); // For Approval Modal
    const [assignee, setAssignee] = useState('');
    const [deadline, setDeadline] = useState('');

    const handleApprove = () => {
        if (!assignee || !deadline) {
            alert('Please select staff and deadline');
            return;
        }
        
        const staff = MOCK_STAFF.find(s => s.id === parseInt(assignee));
        const newTask = {
            id: Date.now(),
            title: selectedTask.title,
            assignee: staff,
            status: 'assigned',
            deadline: deadline,
            locked: false
        };

        setActiveTasks([newTask, ...activeTasks]);
        setInboxTasks(inboxTasks.filter(t => t.id !== selectedTask.id));
        setSelectedTask(null);
        setAssignee('');
        setDeadline('');
    };

    const handleUnlock = (taskId) => {
        setActiveTasks(prev => prev.map(t => {
            if (t.id === taskId) return { ...t, locked: false, status: 'in_progress' };
            return t;
        }));
    };

    const renderKanbanColumn = (title, statusKey, colorClass, icon) => {
        const tasks = activeTasks.filter(t => t.status === statusKey);
        return (
            <div className="bg-slate-900/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col gap-3 min-h-[420px] transition-all hover:border-white/20">
                <div className={`flex items-center justify-between font-bold text-xs uppercase tracking-wider mb-1 px-1 ${colorClass}`}>
                    <div className="flex items-center gap-2">
                        {icon} {title}
                    </div>
                    <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-slate-300 font-extrabold border border-white/10">
                        {tasks.length}
                    </span>
                </div>
                {tasks.map(task => (
                    <div key={task.id} className="bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-lg hover:shadow-2xl hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
                        {task.locked && (
                            <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-md z-10 flex flex-col items-center justify-center gap-2 p-3 text-center animate-fade-in">
                                <div className="flex items-center gap-1.5 text-rose-400 font-black text-xs uppercase tracking-wider">
                                    <ShieldAlert size={16} /> Locked & Delayed
                                </div>
                                <button 
                                    onClick={() => handleUnlock(task.id)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/40 hover:scale-105 active:scale-95"
                                >
                                    <Unlock size={13} /> Unlock Task
                                </button>
                            </div>
                        )}
                        <h4 className="text-white font-bold text-sm mb-3 line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">{task.title}</h4>
                        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-white/5">
                            <div className="flex items-center gap-2" title={task.assignee.name}>
                                <img src={task.assignee.avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-white/30 shadow-sm" />
                                <span className="text-xs text-slate-300 font-medium">{task.assignee.name.split(' ')[0]}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${new Date(task.deadline) < new Date() ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                                <Calendar size={11} />
                                {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-medium border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                        <Layers size={24} className="mb-1 opacity-30" />
                        <span>No Tasks</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in h-full relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-1/2 -right-20 w-96 h-96 bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* Top Metrics Cards - MacBook Glassmorphism Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                <div className="bg-slate-900/50 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-cyan-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider block mb-1">New Requests</span>
                            <p className="text-3xl font-black text-white drop-shadow-md">{inboxTasks.length}</p>
                        </div>
                        <div className="bg-cyan-500/20 backdrop-blur-md p-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                            <Send size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider block mb-1">Active Staff Tasks</span>
                            <p className="text-3xl font-black text-white drop-shadow-md">{activeTasks.filter(t => !['completed', 'delayed'].includes(t.status)).length}</p>
                        </div>
                        <div className="bg-emerald-500/20 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                            <Activity size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-rose-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider block mb-1">Delayed / Locked</span>
                            <p className="text-3xl font-black text-rose-400 drop-shadow-md">{activeTasks.filter(t => t.locked).length}</p>
                        </div>
                        <div className="bg-rose-500/20 backdrop-blur-md p-2.5 rounded-xl border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider block mb-1">Completed (Week)</span>
                            <p className="text-3xl font-black text-white drop-shadow-md">{activeTasks.filter(t => t.status === 'completed').length}</p>
                        </div>
                        <div className="bg-purple-500/20 backdrop-blur-md p-2.5 rounded-xl border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content View Split */}
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 pb-4 relative z-10">
                
                {/* LEFT: Inbox (Pending Approvals) - Glassmorphism Window */}
                <div className="lg:w-1/3 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wider">
                            <LayoutList className="text-purple-400" size={18}/>
                            Pending Approvals
                        </h2>
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black px-2.5 py-0.5 rounded-full backdrop-blur-md">
                            {inboxTasks.length} New
                        </span>
                    </div>

                    <div className="flex-1 bg-slate-900/50 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 min-h-[420px]">
                        {inboxTasks.map(task => (
                            <div 
                                key={task.id} 
                                className="bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 shadow-md"
                                onClick={() => setSelectedTask(task)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-bold text-sm group-hover:text-purple-300 transition-colors leading-snug">{task.title}</h4>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
                                    <div className="flex items-center gap-1.5"><UserCircle size={13} className="text-purple-400"/> {task.requestedBy}</div>
                                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400"/> {task.date}</div>
                                </div>
                                <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-2.5">
                                    <span className="text-[10px] font-extrabold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        {task.type}
                                    </span>
                                    <button className="text-purple-400 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Review & Assign <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {inboxTasks.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                                <CheckCircle2 size={36} className="mb-2 opacity-40 text-purple-400"/>
                                <p className="text-sm font-bold text-slate-300">All caught up!</p>
                                <p className="text-xs text-slate-400 mt-0.5">No pending requests from coordinators.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Kanban Board - Glassmorphism Workspace */}
                <div className="lg:w-2/3 flex flex-col gap-4">
                     <div className="flex items-center justify-between px-1">
                        <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wider">
                            <Activity className="text-cyan-400" size={18}/>
                            Active Staff Tasks Workspace
                        </h2>
                        <button className="text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                            <SlidersHorizontal size={13}/> Filter Workspace
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-900/50 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-x-auto hide-scrollbar p-5">
                        <div className="flex gap-4 h-full min-w-[700px]">
                            <div className="flex-1">
                                {renderKanbanColumn('Assigned', 'assigned', 'text-cyan-400', <Clock size={15}/>)}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('In Progress', 'in_progress', 'text-emerald-400', <Activity size={15}/>)}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('Review & QA', 'review', 'text-amber-400', <Sparkles size={15}/>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ASSIGN MODAL - MacBook Glass Window Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900/90 backdrop-blur-2xl w-full max-w-lg rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-white/20 overflow-hidden relative">
                        
                        {/* macOS Header Bar */}
                        <div className="bg-white/10 backdrop-blur-xl px-5 py-3.5 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                                <span className="text-xs font-bold text-slate-300 ml-2 flex items-center gap-1.5">
                                    <Tag className="text-cyan-400" size={14}/> Task Assignment Inspector
                                </span>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-1 rounded-full border border-white/10">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-5 p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
                                <h4 className="text-white font-bold text-base mb-1">{selectedTask.title}</h4>
                                <p className="text-xs text-slate-400 mb-3">Requested by <span className="text-slate-200 font-semibold">{selectedTask.requestedBy}</span> on {selectedTask.date}</p>
                                <span className="inline-block bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {selectedTask.type}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Assign To Staff Member</label>
                                    <select 
                                        value={assignee}
                                        onChange={(e) => setAssignee(e.target.value)}
                                        className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                                    >
                                        <option value="">-- Select Staff Member --</option>
                                        {MOCK_STAFF.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Target Deadline</label>
                                    <input 
                                        type="date" 
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors [color-scheme:dark] shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedTask(null)}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 border border-transparent transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApprove}
                                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95"
                            >
                                <Send size={14} /> Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
