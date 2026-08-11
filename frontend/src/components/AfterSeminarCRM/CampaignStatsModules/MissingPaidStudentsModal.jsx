import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { FaTimes, FaUserCheck, FaUserPlus, FaSearch, FaUserTie } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function MissingPaidStudentsModal({ isOpen, onClose, businessId, batchId, onStudentPushed }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [selectedCoordinatorMap, setSelectedCoordinatorMap] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [pushingMap, setPushingMap] = useState({});

    useEffect(() => {
        if (isOpen && businessId && batchId) {
            fetchMissingPaidStudents();
            fetchActiveCoordinators();
        }
    }, [isOpen, businessId, batchId]);

    const fetchMissingPaidStudents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/missing-paid-students', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId, batchId }
            });
            setStudents(res.data.missingStudents || []);
        } catch (error) {
            toast.error("Failed to fetch missing paid web students");
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveCoordinators = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/coordinators', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStaffList(res.data || []);
        } catch (error) {
            console.error("Failed to fetch coordinators:", error);
        }
    };

    const handlePushStudent = async (studentId) => {
        const coordinatorId = selectedCoordinatorMap[studentId];
        if (!coordinatorId) {
            toast.error("Please select a coordinator for this student");
            return;
        }

        setPushingMap(prev => ({ ...prev, [studentId]: true }));
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/push-missing-student-to-crm', {
                studentId,
                businessId,
                batchId: batchId === 'ALL' ? null : batchId,
                coordinatorId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Paid web student pushed and assigned successfully!");
            setStudents(students.filter(s => s.id !== studentId));
            if (onStudentPushed) onStudentPushed();
        } catch (error) {
            toast.error("Failed to push student to CRM");
        } finally {
            setPushingMap(prev => ({ ...prev, [studentId]: false }));
        }
    };

    if (!isOpen) return null;

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.phone.includes(searchQuery) ||
        s.nic.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
            <div className="bg-[#0F172A] border border-white/10 rounded-3xl w-full max-w-5xl p-6 md:p-8 flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="flex justify-between items-center pb-5 border-b border-white/10 mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                            <FaUserCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Missing Paid Web Students</h2>
                            <p className="text-xs text-slate-400">Paid web platform students without matching CRM leads for this batch</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Controls */}
                <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 mb-6 relative z-10 w-full md:w-1/2">
                    <FaSearch className="text-slate-400 mr-2" size={14} />
                    <input
                        type="text"
                        placeholder="Search student name, phone, or NIC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs text-white outline-none w-full"
                    />
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500 animate-pulse">Scanning verified web payments...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">100% Matching! All paid web students exist in this CRM batch.</div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 bg-[#0F172A] z-10">
                                    <th className="p-3">Student Name</th>
                                    <th className="p-3">Web Phone</th>
                                    <th className="p-3">NIC</th>
                                    <th className="p-3">Batch</th>
                                    <th className="p-3">Assign Coordinator</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-semibold text-white">{s.name}</td>
                                        <td className="p-3 font-mono text-emerald-400">{s.phone}</td>
                                        <td className="p-3 text-slate-300">{s.nic || 'N/A'}</td>
                                        <td className="p-3 text-slate-400">{s.batchName || 'Default'}</td>
                                        <td className="p-3">
                                            <select
                                                value={selectedCoordinatorMap[s.id] || ''}
                                                onChange={(e) => setSelectedCoordinatorMap({ ...selectedCoordinatorMap, [s.id]: e.target.value })}
                                                className="bg-black/40 border border-white/10 text-xs text-white rounded-lg px-3 py-1.5 outline-none cursor-pointer w-full max-w-[200px]"
                                            >
                                                <option value="" className="bg-slate-900">Select Coordinator...</option>
                                                {staffList.map(st => (
                                                    <option key={st.id} value={st.id} className="bg-slate-900">{st.firstName} {st.lastName}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => handlePushStudent(s.id)}
                                                disabled={pushingMap[s.id]}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 ml-auto"
                                            >
                                                <FaUserPlus size={12} /> {pushingMap[s.id] ? 'Pushing...' : 'Push to CRM'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
