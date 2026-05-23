import React, { useState, useEffect } from 'react';
import { FaBell, FaTimes, FaCheckCircle, FaTrash, FaEdit, FaSave } from 'react-icons/fa';
import axios from '../api/axios'; 
import toast from 'react-hot-toast';

export default function GlobalReminderWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [reminders, setReminders] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editNote, setEditNote] = useState('');

    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const agentId = loggedUser.id || loggedUser.userId;

    useEffect(() => {
        if (!agentId) return;
        fetchReminders();
        const interval = setInterval(fetchReminders, 60000); 
        return () => clearInterval(interval);
    }, [agentId]);

    useEffect(() => {
        const now = new Date().getTime();
        reminders.forEach(r => {
            const remindTime = new Date(r.remindAt).getTime();
            if (remindTime <= now && !r.notifiedLocally) {
                toast(`⏰ REMINDER: Call ${r.phone} (${r.name || 'Student'})`, { icon: '🔔', duration: 8000 });
                r.notifiedLocally = true; 
                setIsOpen(true);
            }
        });
    }, [reminders]);

    const fetchReminders = async () => {
        try {
            const res = await axios.get(`/reminders/my-reminders?agentId=${agentId}`);
            setReminders(res.data.map(r => ({ ...r, notifiedLocally: false })));
        } catch (error) { console.error("Failed to fetch reminders"); }
    };

    const handleClear = async (id) => {
        try {
            await axios.post('/reminders/mark-done', { reminderId: id });
            setReminders(reminders.filter(r => r.id !== id));
            toast.success("Reminder Cleared!");
        } catch (error) { toast.error("Failed to clear"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this reminder?")) return;
        try {
            await axios.delete(`/reminders/delete/${id}`);
            setReminders(reminders.filter(r => r.id !== id));
            toast.success("Reminder Deleted!");
        } catch (error) { toast.error("Failed to delete"); }
    };

    const startEdit = (r) => {
        setEditingId(r.id);
        const d = new Date(r.remindAt);
        setEditDate(d.toISOString().split('T')[0]);
        setEditTime(d.toTimeString().slice(0, 5));
        setEditNote(r.note || '');
    };

    const saveEdit = async (id) => {
        try {
            const formattedDate = new Date(`${editDate}T${editTime}:00`).toISOString();
            await axios.put('/reminders/edit', { reminderId: id, remindAt: formattedDate, note: editNote });
            toast.success("Reminder Updated!");
            setEditingId(null);
            fetchReminders();
        } catch (error) { toast.error("Failed to update"); }
    };

    // 🔥 FIX: Redirect Logic එක අදාළ Campaign එකට යන විදියට හැදුවා 🔥
    const handleRedirect = (type, phone) => {
        let path = '/workspace/campaign/new-inquiries';
        if (type === 'OPEN_SEMINAR') path = '/workspace/campaign/open-seminar';
        else if (type === 'NORMAL') path = '/workspace/campaign/open-seminar';

        // LocalStorage එකේ සේව් කරලා යවනවා Search වෙන්න ලේසි වෙන්න
        localStorage.setItem('global_search_query', phone);
        
        // කෙලින්ම Page එකට Redirect කරනවා Phone Number එකත් එක්ක
        window.location.href = `${path}?search=${phone}`;
        setIsOpen(false);
    };

    if (!agentId) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-amber-500 hover:bg-amber-400 text-white w-14 h-14 rounded-full flex justify-center items-center shadow-lg shadow-amber-500/30 transition-transform hover:scale-110 relative border-2 border-white/20"
            >
                <FaBell size={24} className={reminders.some(r => new Date(r.remindAt) <= new Date()) ? 'animate-bounce' : ''} />
                {reminders.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex justify-center items-center rounded-full border-2 border-[#0f172a]">
                        {reminders.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl animate-fade-in-up flex flex-col max-h-[500px]">
                    <div className="p-4 bg-slate-800/80 border-b border-slate-700 rounded-t-2xl flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2 text-sm"><FaBell className="text-amber-400"/> My Reminders</h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><FaTimes/></button>
                    </div>

                    <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                        {reminders.length === 0 ? (
                            <p className="text-center text-slate-500 text-xs py-10 font-medium">No upcoming reminders.</p>
                        ) : (
                            reminders.map(r => {
                                const isPastDue = new Date(r.remindAt) <= new Date();
                                const isEditing = editingId === r.id;

                                return (
                                    <div key={r.id} className={`p-3 rounded-xl border ${isPastDue ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10'}`}>
                                        
                                        {!isEditing ? (
                                            <>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div 
                                                        className="cursor-pointer group" 
                                                        onClick={() => handleRedirect(r.leadType, r.phone)}
                                                    >
                                                        <p className={`font-black text-sm group-hover:underline ${isPastDue ? 'text-rose-400' : 'text-white'}`}>{r.phone}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{r.name || 'Student'}</p>
                                                    </div>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isPastDue ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {new Date(r.remindAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                                {r.note && <p className="text-xs text-slate-300 italic mb-3 bg-black/20 p-2 rounded-lg">{r.note}</p>}
                                                
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button onClick={() => handleClear(r.id)} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"><FaCheckCircle/> Done</button>
                                                    <button onClick={() => startEdit(r)} className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-colors"><FaEdit size={12}/></button>
                                                    <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"><FaTrash size={12}/></button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} className="flex-1 bg-black/40 border border-slate-700 text-xs text-white p-1.5 rounded outline-none focus:border-amber-500" />
                                                    <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} className="w-20 bg-black/40 border border-slate-700 text-xs text-white p-1.5 rounded outline-none focus:border-amber-500" />
                                                </div>
                                                <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} className="w-full bg-black/40 border border-slate-700 text-xs text-white p-1.5 rounded outline-none focus:border-amber-500 resize-none h-12"></textarea>
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveEdit(r.id)} className="flex-1 bg-amber-500 text-white text-[10px] font-bold py-1.5 rounded flex justify-center items-center gap-1"><FaSave/> Save</button>
                                                    <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-700 text-white text-[10px] font-bold py-1.5 rounded">Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}