import React, { useState } from 'react';
import { 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Calendar,
    ChevronRight,
    UserCircle,
    LayoutList,
    MoreVertical,
    Unlock,
    Send,
    Tag,
    X,
    Filter,
    Activity
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
            <div className="bg-[#1e293b]/50 rounded-xl p-4 border border-white/5 flex flex-col gap-3 min-h-[400px]">
                <div className={`flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2 ${colorClass}`}>
                    {icon} {title} ({tasks.length})
                </div>
                {tasks.map(task => (
                    <div key={task.id} className="bg-[#23303f] p-4 rounded-xl border border-white/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        {task.locked && (
                            <div className="absolute inset-0 bg-red-900/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                                <div className="text-red-400 font-bold text-sm drop-shadow-md">TASK DELAYED & LOCKED</div>
                                <button 
                                    onClick={() => handleUnlock(task.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-red-500/20"
                                >
                                    <Unlock size={14} /> Unlock Access
                                </button>
                            </div>
                        )}
                        <h4 className="text-white font-bold text-sm mb-3 line-clamp-2">{task.title}</h4>
                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2" title={task.assignee.name}>
                                <img src={task.assignee.avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-white/20" />
                                <span className="text-xs text-slate-400 font-medium">{task.assignee.name.split(' ')[0]}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold ${new Date(task.deadline) < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                                <Calendar size={12} />
                                {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-medium border-2 border-dashed border-white/5 rounded-xl">
                        No Tasks
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in-up h-full">
            
            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#1e293b] to-[#23303f] p-5 rounded-2xl border border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">New Requests</h3>
                            <p className="text-3xl font-black text-white">{inboxTasks.length}</p>
                        </div>
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <Send size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#1e293b] to-[#23303f] p-5 rounded-2xl border border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Staff Tasks</h3>
                            <p className="text-3xl font-black text-white">{activeTasks.filter(t => !['completed', 'delayed'].includes(t.status)).length}</p>
                        </div>
                        <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                            <Activity size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#1e293b] to-[#23303f] p-5 rounded-2xl border border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-red-500/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Delayed / Locked</h3>
                            <p className="text-3xl font-black text-red-400">{activeTasks.filter(t => t.locked).length}</p>
                        </div>
                        <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#1e293b] to-[#23303f] p-5 rounded-2xl border border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#E00A14]/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-[#E00A14]/20"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Completed (Week)</h3>
                            <p className="text-3xl font-black text-white">{activeTasks.filter(t => t.status === 'completed').length}</p>
                        </div>
                        <div className="bg-[#E00A14]/20 p-2 rounded-lg text-[#E00A14]">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Split View */}
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 pb-4">
                
                {/* LEFT: Inbox (Pending Approvals) */}
                <div className="lg:w-1/3 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <LayoutList className="text-[#E00A14]" size={20}/>
                            Pending Approvals
                        </h2>
                        <span className="bg-[#E00A14]/20 text-[#E00A14] text-xs font-bold px-2 py-1 rounded-md">{inboxTasks.length} New</span>
                    </div>

                    <div className="flex-1 bg-[#1e293b] rounded-2xl border border-white/5 shadow-md overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 min-h-[300px]">
                        {inboxTasks.map(task => (
                            <div key={task.id} className="bg-[#23303f] p-4 rounded-xl border border-white/5 hover:border-[#E00A14]/50 transition-all cursor-pointer group" onClick={() => setSelectedTask(task)}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-bold text-sm group-hover:text-[#E00A14] transition-colors">{task.title}</h4>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                                    <div className="flex items-center gap-1"><UserCircle size={14}/> {task.requestedBy}</div>
                                    <div className="flex items-center gap-1"><Calendar size={14}/> {task.date}</div>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded">{task.type}</span>
                                    <button className="text-[#E00A14] text-xs font-bold flex items-center gap-1 hover:underline">
                                        Review & Assign <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {inboxTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center h-40 text-slate-500">
                                <CheckCircle2 size={32} className="mb-2 opacity-50"/>
                                <p className="text-sm font-medium">All caught up!</p>
                                <p className="text-xs">No pending requests from coordinators.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Kanban Board */}
                <div className="lg:w-2/3 flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="text-emerald-400" size={20}/>
                            Active Staff Tasks
                        </h2>
                        <button className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                            <Filter size={14}/> Filter
                        </button>
                    </div>

                    <div className="flex-1 bg-[#1e293b] rounded-2xl border border-white/5 shadow-md overflow-x-auto hide-scrollbar p-6">
                        <div className="flex gap-4 h-full min-w-[700px]">
                            <div className="flex-1">
                                {renderKanbanColumn('Assigned', 'assigned', 'text-blue-400', <Clock size={16}/>)}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('In Progress', 'in_progress', 'text-emerald-400', <Activity size={16}/>)}
                            </div>
                            <div className="flex-1">
                                {renderKanbanColumn('Review', 'review', 'text-amber-400', <CheckCircle2 size={16}/>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ASSIGN MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                        <div className="bg-[#23303f] px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Tag className="text-[#E00A14]" size={18}/> Approve & Assign
                            </h3>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1 rounded-md">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 p-4 bg-black/20 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-1">{selectedTask.title}</h4>
                                <p className="text-xs text-slate-400 mb-2">Requested by {selectedTask.requestedBy} on {selectedTask.date}</p>
                                <span className="inline-block bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{selectedTask.type}</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign To Staff</label>
                                    <select 
                                        value={assignee}
                                        onChange={(e) => setAssignee(e.target.value)}
                                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E00A14] transition-colors"
                                    >
                                        <option value="">-- Select Staff Member --</option>
                                        {MOCK_STAFF.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deadline</label>
                                    <input 
                                        type="date" 
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E00A14] transition-colors [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#23303f] px-6 py-4 border-t border-white/5 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedTask(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApprove}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#E00A14] text-white hover:bg-[#E00A14]/90 transition-all flex items-center gap-2 shadow-lg shadow-[#E00A14]/20"
                            >
                                <Send size={16} /> Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
