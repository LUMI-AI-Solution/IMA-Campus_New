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
    Filter,
    ShieldAlert,
    ArrowUpRight
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

    const renderKanbanColumn = (title, statusKey, icon, badgeColor) => {
        const tasks = activeTasks.filter(t => t.status === statusKey);
        return (
            <div className="bg-[#111827]/70 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex flex-col gap-3 min-h-[440px]">
                <div className="flex items-center justify-between font-semibold text-xs uppercase tracking-wider mb-1 px-1 text-slate-300">
                    <div className="flex items-center gap-2">
                        {icon} {title}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                        {tasks.length}
                    </span>
                </div>
                {tasks.map(task => (
                    <div key={task.id} className="bg-[#1F2937]/80 p-4 rounded-xl border border-slate-700/70 hover:border-slate-500 transition-all duration-200 group relative overflow-hidden shadow-md">
                        {task.locked && (
                            <div className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-md z-10 flex flex-col items-center justify-center gap-2 p-3 text-center">
                                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                                    <ShieldAlert size={15} /> Locked & Delayed
                                </div>
                                <button 
                                    onClick={() => handleUnlock(task.id)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    <Unlock size={12} /> Unlock Task
                                </button>
                            </div>
                        )}
                        <h4 className="text-slate-100 font-semibold text-sm mb-3 line-clamp-2 leading-snug group-hover:text-white transition-colors">{task.title}</h4>
                        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-700/60">
                            <div className="flex items-center gap-2" title={task.assignee.name}>
                                <img src={task.assignee.avatar} alt="Avatar" className="w-5 h-5 rounded-full border border-slate-600 shadow-xs" />
                                <span className="text-xs text-slate-300 font-medium">{task.assignee.name.split(' ')[0]}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${new Date(task.deadline) < new Date() ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                <Calendar size={11} />
                                {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                        No Tasks
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in h-full">
            
            {/* Top Metrics Cards - Clean Executive Dashboard Aesthetic */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#111827]/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-sm border-t-2 border-t-indigo-500 flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">New Requests</span>
                        <p className="text-3xl font-extrabold text-white tracking-tight">{inboxTasks.length}</p>
                    </div>
                    <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-xl border border-indigo-500/20">
                        <Send size={18} />
                    </div>
                </div>

                <div className="bg-[#111827]/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-sm border-t-2 border-t-blue-500 flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">Active Staff Tasks</span>
                        <p className="text-3xl font-extrabold text-white tracking-tight">{activeTasks.filter(t => !['completed', 'delayed'].includes(t.status)).length}</p>
                    </div>
                    <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl border border-blue-500/20">
                        <Activity size={18} />
                    </div>
                </div>

                <div className="bg-[#111827]/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-sm border-t-2 border-t-rose-500 flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">Delayed / Locked</span>
                        <p className="text-3xl font-extrabold text-rose-400 tracking-tight">{activeTasks.filter(t => t.locked).length}</p>
                    </div>
                    <div className="bg-rose-500/10 text-rose-400 p-3 rounded-xl border border-rose-500/20">
                        <AlertCircle size={18} />
                    </div>
                </div>

                <div className="bg-[#111827]/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-sm border-t-2 border-t-emerald-500 flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">Completed (Week)</span>
                        <p className="text-3xl font-extrabold text-white tracking-tight">{activeTasks.filter(t => t.status === 'completed').length}</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 size={18} />
                    </div>
                </div>
            </div>

            {/* Main Content View Split */}
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 pb-4">
                
                {/* LEFT: Inbox (Pending Approvals) */}
                <div className="lg:w-1/3 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                            <LayoutList className="text-indigo-400" size={16}/>
                            Pending Approvals
                        </h2>
                        <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {inboxTasks.length} New
                        </span>
                    </div>

                    <div className="flex-1 bg-[#111827]/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-sm overflow-y-auto custom-scrollbar p-3.5 flex flex-col gap-3 min-h-[440px]">
                        {inboxTasks.map(task => (
                            <div 
                                key={task.id} 
                                className="bg-[#1F2937]/80 p-4 rounded-xl border border-slate-700/70 hover:border-slate-500 transition-all duration-200 cursor-pointer group shadow-sm"
                                onClick={() => setSelectedTask(task)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-slate-100 font-semibold text-sm group-hover:text-white transition-colors leading-snug">{task.title}</h4>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                                    <div className="flex items-center gap-1.5"><UserCircle size={13} className="text-slate-400"/> {task.requestedBy}</div>
                                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400"/> {task.date}</div>
                                </div>
                                <div className="mt-3.5 flex items-center justify-between border-t border-slate-700/60 pt-3">
                                    <span className="text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        {task.type}
                                    </span>
                                    <button className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors">
                                        Review & Assign <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {inboxTasks.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                                <CheckCircle2 size={32} className="mb-2 opacity-40 text-slate-400"/>
                                <p className="text-sm font-semibold text-slate-300">All caught up!</p>
                                <p className="text-xs text-slate-400 mt-0.5">No pending requests from coordinators.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Kanban Board */}
                <div className="lg:w-2/3 flex flex-col gap-3">
                     <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                            <Activity className="text-blue-400" size={16}/>
                            Active Staff Tasks
                        </h2>
                        <button className="text-slate-300 hover:text-white transition-colors bg-[#1F2937] border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <Filter size={13}/> Filter
                        </button>
                    </div>

                    <div className="flex-1 bg-[#111827]/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-sm overflow-x-auto hide-scrollbar p-4">
                        <div className="flex gap-4 h-full min-w-[650px]">
                            <div className="flex-1">
                                {renderKanbanColumn('Assigned', 'assigned', <Clock size={14} className="text-blue-400"/>, 'bg-blue-500/10 text-blue-400 border-blue-500/20')}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('In Progress', 'in_progress', <Activity size={14} className="text-emerald-400"/>, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('Review', 'review', <Sparkles size={14} className="text-amber-400"/>, 'bg-amber-500/10 text-amber-400 border-amber-500/20')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ASSIGN MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#111827] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative">
                        
                        {/* Header */}
                        <div className="bg-[#1F2937] px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Tag className="text-indigo-400" size={16}/> Task Assignment Inspector
                            </h3>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-5 p-4 bg-slate-900/90 rounded-xl border border-slate-800">
                                <h4 className="text-white font-semibold text-base mb-1">{selectedTask.title}</h4>
                                <p className="text-xs text-slate-400 mb-3">Requested by <span className="text-slate-200 font-medium">{selectedTask.requestedBy}</span> on {selectedTask.date}</p>
                                <span className="inline-block bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {selectedTask.type}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign To Staff Member</label>
                                    <select 
                                        value={assignee}
                                        onChange={(e) => setAssignee(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="">-- Select Staff Member --</option>
                                        {MOCK_STAFF.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Deadline</label>
                                    <input 
                                        type="date" 
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1F2937]/50 px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedTask(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApprove}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
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
