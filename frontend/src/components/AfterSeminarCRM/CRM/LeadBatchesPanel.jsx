import React, { useEffect, useState } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { FaLayerGroup, FaPlus, FaTrash, FaCheckCircle, FaUserTie } from 'react-icons/fa';

// 🔥 MULTI-BATCH ALLOCATION PANEL 🔥
// One chat room, many batches. Main batch = "Allocate to Batch" above (unchanged).
// Extra batches each get their own coordinator (managers only can add / change / remove).
export default function LeadBatchesPanel({ leadId, batches = [], refreshKey }) {
    const [data, setData] = useState(null);
    const [coordinators, setCoordinators] = useState([]);
    const [newBatchId, setNewBatchId] = useState('');
    const [newCoordinatorId, setNewCoordinatorId] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        if (!leadId) return;
        try {
            const res = await axios.get(`/after-seminar-crm/leads/${leadId}/batches`);
            setData(res.data);
            if (res.data?.isManager && coordinators.length === 0) {
                const c = await axios.get('/after-seminar-crm/coordinators');
                setCoordinators(Array.isArray(c.data) ? c.data : []);
            }
        } catch (e) {
            console.error('Lead batches load failed:', e);
        }
    };

    useEffect(() => {
        setData(null);
        setNewBatchId('');
        setNewCoordinatorId('');
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId, refreshKey]);

    if (!leadId || !data) return null;

    const isManager = Boolean(data.isManager);
    const usedBatchIds = new Set([data.primary?.batchId, ...(data.extras || []).map(x => x.batchId)].filter(Boolean).map(String));
    const addableBatches = batches.filter(b => !usedBatchIds.has(String(b.id)));
    const coordName = (c) => `${c.firstName || ''} ${c.lastName || ''}`.trim();

    const addBatch = async () => {
        if (!newBatchId) return toast.error('Select a batch');
        setBusy(true);
        try {
            await axios.post(`/after-seminar-crm/leads/${leadId}/batches`, {
                batchId: newBatchId,
                assignedTo: newCoordinatorId || null
            });
            toast.success('Batch added to this chat');
            setNewBatchId('');
            setNewCoordinatorId('');
            await load();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to add batch');
        } finally {
            setBusy(false);
        }
    };

    const changeCoordinator = async (rowId, assignedTo) => {
        setBusy(true);
        try {
            await axios.patch(`/after-seminar-crm/lead-batches/${rowId}`, { assignedTo: assignedTo || null });
            toast.success('Coordinator updated');
            await load();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to update coordinator');
        } finally {
            setBusy(false);
        }
    };

    const removeRow = async (rowId, name) => {
        if (!window.confirm(`Remove ${name} from this chat? Its paid-campaign call notes for that batch will be deleted.`)) return;
        setBusy(true);
        try {
            await axios.delete(`/after-seminar-crm/lead-batches/${rowId}`);
            toast.success('Batch removed');
            await load();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to remove batch');
        } finally {
            setBusy(false);
        }
    };

    if (!isManager && (data.extras || []).length === 0) return null;

    return (
        <div className="p-4 rounded-xl border border-violet-500/20 bg-[#1a2430] mb-4 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                <FaLayerGroup /> Batches of this chat
            </h3>

            {data.primary && (
                <div className="flex items-center justify-between gap-2 bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-2 mb-2">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-200 truncate">{data.primary.batchName} <span className="text-[8px] font-black uppercase text-emerald-400 ml-1">Main</span></p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1"><FaUserTie size={9} /> {data.primary.assignedName || 'Unassigned'}</p>
                    </div>
                    {data.primary.enrolled && <span className="text-[9px] font-black text-emerald-300 flex items-center gap-1 shrink-0"><FaCheckCircle size={9} /> Enrolled</span>}
                </div>
            )}

            {(data.extras || []).map(x => (
                <div key={x.id} className={`bg-[#0f172a] border rounded-lg px-2.5 py-2 mb-2 ${x.assignedTo ? 'border-violet-500/30' : 'border-amber-500/40'}`}>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-slate-200 truncate">{x.batchName}</p>
                        <div className="flex items-center gap-2 shrink-0">
                            {x.enrolled && <span className="text-[9px] font-black text-emerald-300 flex items-center gap-1"><FaCheckCircle size={9} /> Enrolled</span>}
                            {isManager && (
                                <button type="button" disabled={busy} onClick={() => removeRow(x.id, x.batchName)} className="text-slate-500 hover:text-rose-400" title="Remove batch">
                                    <FaTrash size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isManager ? (
                        <select
                            value={x.assignedTo || ''}
                            disabled={busy}
                            onChange={(e) => changeCoordinator(x.id, e.target.value)}
                            className={`w-full mt-1.5 p-1.5 text-[11px] bg-[#0b1220] border rounded-md outline-none ${x.assignedTo ? 'border-slate-700 text-slate-300' : 'border-amber-500/50 text-amber-300'}`}
                        >
                            <option value="">⚠ Unassigned — select coordinator</option>
                            {coordinators.map(c => <option key={c.id} value={c.id}>{coordName(c)}</option>)}
                        </select>
                    ) : (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><FaUserTie size={9} /> {x.assignedName || 'Unassigned'}</p>
                    )}
                    {x.source === 'PAYMENT_AUTO' && !x.assignedTo && (
                        <p className="text-[9px] text-amber-300/80 mt-1">Added automatically from an approved payment.</p>
                    )}
                </div>
            ))}

            {isManager && data.primary && (
                <div className="mt-2 pt-2 border-t border-white/5">
                    <select value={newBatchId} onChange={(e) => setNewBatchId(e.target.value)} className="w-full mb-1.5 p-1.5 text-[11px] bg-[#0f172a] border border-slate-700 rounded-md text-slate-300 outline-none">
                        <option value="">+ Add another batch...</option>
                        {addableBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {newBatchId && (
                        <>
                            <select value={newCoordinatorId} onChange={(e) => setNewCoordinatorId(e.target.value)} className="w-full mb-1.5 p-1.5 text-[11px] bg-[#0f172a] border border-slate-700 rounded-md text-slate-300 outline-none">
                                <option value="">Coordinator (optional)</option>
                                {coordinators.map(c => <option key={c.id} value={c.id}>{coordName(c)}</option>)}
                            </select>
                            <button type="button" disabled={busy} onClick={addBatch} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-1.5 rounded-md text-[11px] flex items-center justify-center gap-1.5">
                                <FaPlus size={9} /> Add batch
                            </button>
                        </>
                    )}
                </div>
            )}
            {isManager && !data.primary && (
                <p className="text-[10px] text-slate-500">Set the main batch first, then add more batches here.</p>
            )}
        </div>
    );
}
