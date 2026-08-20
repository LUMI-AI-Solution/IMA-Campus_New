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

    const renderKanbanColumn = (title, statusKey, icon) => {
        const tasks = activeTasks.filter(t => t.status === statusKey);
        return (
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-slate-800 flex flex-col gap-3 min-h-[420px]">
                <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider mb-1 px-1 text-slate-300">
                    <div className="flex items-center gap-2 text-slate-300">
                        {icon} {title}
                    </div>
                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-700">
                        {tasks.length}
                    </span>
                </div>
                {tasks.map(task => (
                    <div key={task.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 hover:border-slate-500 transition-all duration-200 group relative overflow-hidden shadow-sm">
                        {task.locked && (
                            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 p-3 text-center">
                                <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                                    <ShieldAlert size={15} /> Locked & Delayed
                                </div>
                                <button 
                                    onClick={() => handleUnlock(task.id)}
                                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    <Unlock size={12} /> Unlock
                                </button>
                            </div>
                        )}
                        <h4 className="text-slate-100 font-semibold text-sm mb-3 line-clamp-2 leading-snug group-hover:text-white transition-colors">{task.title}</h4>
                        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-700/50">
                            <div className="flex items-center gap-2" title={task.assignee.name}>
                                <img src={task.assignee.avatar} alt="Avatar" className="w-5 h-5 rounded-full border border-slate-600" />
                                <span className="text-xs text-slate-300 font-medium">{task.assignee.name.split(' ')[0]}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${new Date(task.deadline) < new Date() ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-400'}`}>
                                <Calendar size={11} />
                                {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                        No Tasks
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-5 animate-fade-in h-full">
            
            {/* Top Metrics Cards - Clean Minimalist Executive Aesthetic */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 backdrop-blur-xl p-4.5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-1">New Requests</span>
                        <p className="text-2xl font-bold text-slate-100">{inboxTasks.length}</p>
                    </div>
                    <div className="bg-slate-800 text-slate-300 p-2.5 rounded-lg border border-slate-700">
                        <Send size={18} />
                    </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl p-4.5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-1">Active Staff Tasks</span>
                        <p className="text-2xl font-bold text-slate-100">{activeTasks.filter(t => !['completed', 'delayed'].includes(t.status)).length}</p>
                    </div>
                    <div className="bg-slate-800 text-slate-300 p-2.5 rounded-lg border border-slate-700">
                        <Activity size={18} />
                    </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl p-4.5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-1">Delayed / Locked</span>
                        <p className="text-2xl font-bold text-red-400">{activeTasks.filter(t => t.locked).length}</p>
                    </div>
                    <div className="bg-red-500/10 text-red-400 p-2.5 rounded-lg border border-red-500/20">
                        <AlertCircle size={18} />
                    </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl p-4.5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-1">Completed (Week)</span>
                        <p className="text-2xl font-bold text-slate-100">{activeTasks.filter(t => t.status === 'completed').length}</p>
                    </div>
                    <div className="bg-slate-800 text-emerald-400 p-2.5 rounded-lg border border-slate-700">
                        <CheckCircle2 size={18} />
                    </div>
                </div>
            </div>

            {/* Main Content View Split */}
            <div className="flex flex-col lg:flex-row gap-5 h-full min-h-0 pb-4">
                
                {/* LEFT: Inbox (Pending Approvals) */}
                <div className="lg:w-1/3 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                            <LayoutList className="text-slate-400" size={16}/>
                            Pending Approvals
                        </h2>
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                            {inboxTasks.length} New
                        </span>
                    </div>

                    <div className="flex-1 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-800 shadow-sm overflow-y-auto custom-scrollbar p-3.5 flex flex-col gap-2.5 min-h-[420px]">
                        {inboxTasks.map(task => (
                            <div 
                                key={task.id} 
                                className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 hover:border-slate-500 transition-all duration-200 cursor-pointer group shadow-sm"
                                onClick={() => setSelectedTask(task)}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <h4 className="text-slate-100 font-semibold text-sm group-hover:text-white transition-colors leading-snug">{task.title}</h4>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                                    <div className="flex items-center gap-1.5"><UserCircle size={13} className="text-slate-400"/> {task.requestedBy}</div>
                                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400"/> {task.date}</div>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-slate-700/50 pt-2.5">
                                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {task.type}
                                    </span>
                                    <button className="text-blue-400 text-xs font-semibold flex items-center gap-1 group-hover:text-blue-300 transition-colors">
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
                            <Activity className="text-slate-400" size={16}/>
                            Active Staff Tasks
                        </h2>
                        <button className="text-slate-400 hover:text-slate-200 transition-colors bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <Filter size={13}/> Filter
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-800 shadow-sm overflow-x-auto hide-scrollbar p-4">
                        <div className="flex gap-4 h-full min-w-[650px]">
                            <div className="flex-1">
                                {renderKanbanColumn('Assigned', 'assigned', <Clock size={14}/>)}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('In Progress', 'in_progress', <Activity size={14}/>)}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('Review', 'review', <Sparkles size={14}/>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ASSIGN MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-800 overflow-hidden relative">
                        
                        {/* Header */}
                        <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <Tag className="text-blue-400" size={15}/> Task Assignment
                            </h3>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1 rounded-lg border border-slate-700">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="mb-4 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                                <h4 className="text-slate-100 font-semibold text-sm mb-1">{selectedTask.title}</h4>
                                <p className="text-xs text-slate-400 mb-2">Requested by <span className="text-slate-300 font-medium">{selectedTask.requestedBy}</span> on {selectedTask.date}</p>
                                <span className="inline-block bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                                    {selectedTask.type}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assign To Staff Member</label>
                                    <select 
                                        value={assignee}
                                        onChange={(e) => setAssignee(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="">-- Select Staff Member --</option>
                                        {MOCK_STAFF.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Deadline</label>
                                    <input 
                                        type="date" 
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 px-5 py-3 border-t border-slate-700/60 flex justify-end gap-2.5">
                            <button 
                                onClick={() => setSelectedTask(null)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApprove}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Send size={13} /> Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
