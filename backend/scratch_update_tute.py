import re

with open('/root/IMA-Campus/frontend/src/pages/delivery/components/TuteStock.jsx', 'r') as f:
    content = f.read()

# Add masterData state
content = content.replace(
    "const [globalStock, setGlobalStock] = useState([]);",
    "const [globalStock, setGlobalStock] = useState([]);\n    const [masterData, setMasterData] = useState([]);\n    const [showTuteModal, setShowTuteModal] = useState(false);\n    const [tuteFormData, setTuteFormData] = useState({ id: null, courseId: '', tuteName: '', itemOrder: 1, imageFile: null });\n    const [showLecModal, setShowLecModal] = useState(false);\n    const [lecFormData, setLecFormData] = useState({ oldName: '', newName: '', imageFile: null });"
)

# Update fetchGlobalStock
content = content.replace(
    "setGlobalStock(res.data || []);",
    "if (Array.isArray(res.data)) { setGlobalStock(res.data); } else { setGlobalStock(res.data.stocks || []); setMasterData(res.data.masterData || []); }"
)

# Add business logic for lecturers
# Right now lecturers is an array of names. We need to attach their image and business.
content = content.replace(
    """const lecturers = useMemo(() => {
        const lecs = new Set();
        globalStock.forEach(s => lecs.add(s.course?.lecturerName || "Unknown Lecturer"));
        return Array.from(lecs).sort();
    }, [globalStock]);""",
    """const lecturers = useMemo(() => {
        const lecMap = new Map();
        globalStock.forEach(s => {
            const name = s.course?.lecturerName || "Unknown Lecturer";
            const biz = s.course?.group?.batch?.business?.name || "Unknown";
            if (!lecMap.has(name)) lecMap.set(name, new Set());
            if (biz !== "Unknown") lecMap.get(name).add(biz);
        });
        return Array.from(lecMap.keys()).sort().map(name => {
            const mData = masterData.find(m => m.name === name);
            return {
                name,
                image: mData?.image || null,
                businesses: Array.from(lecMap.get(name))
            };
        });
    }, [globalStock, masterData]);"""
)

# Update filteredLecturers
content = content.replace(
    "return lecturers.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()));",
    "return lecturers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));"
)

# Update Lecturer Click
content = content.replace(
    "const handleLecturerClick = (lec) => {",
    "const handleLecturerClick = (lecName) => {\n        setSelectedLecturer(lecName);"
)
content = content.replace(
    "setSelectedLecturer(lec);",
    ""
)
# Update Lecturer Render
lec_render_old = """{filteredLecturers.map((lec, idx) => (
                        <div key={idx} 
                             onClick={() => handleLecturerClick(lec)}
                             className="group relative bg-white/5 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-pink-500/50 dark:hover:border-pink-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1">
                            <div className="w-20 h-20 bg-gradient-to-br from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 rounded-2xl flex items-center justify-center mb-4 text-pink-600 dark:text-pink-400 font-bold text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300 ring-1 ring-inset ring-pink-500/20">
                                {lec.substring(0, 2).toUpperCase()}
                            </div>
                            <h3 className="font-black text-lg text-slate-800 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-2">{lec}</h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full uppercase tracking-wider mt-2 group-hover:bg-pink-50 dark:group-hover:bg-pink-500/10 transition-colors">
                                View Lecturer Details
                            </p>
                        </div>
                    ))}"""

lec_render_new = """{filteredLecturers.map((lec, idx) => (
                        <div key={idx} className="group relative bg-white/5 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-pink-500/50 dark:hover:border-pink-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1">
                            <div className="absolute top-2 right-2 flex gap-1 z-10">
                                <button onClick={(e) => { e.stopPropagation(); setLecFormData({ oldName: lec.name, newName: lec.name, imageFile: null }); setShowLecModal(true); }} className="p-1.5 bg-slate-200/50 hover:bg-amber-500/20 text-amber-600 rounded-lg transition-colors"><Edit2 size={14}/></button>
                                {!isReadOnly && <button onClick={(e) => { e.stopPropagation(); handleDeleteLecturer(lec.name); }} className="p-1.5 bg-slate-200/50 hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors"><Trash2 size={14}/></button>}
                            </div>
                            <div onClick={() => handleLecturerClick(lec.name)} className="flex flex-col items-center w-full">
                                {lec.image && lec.image !== 'null' ? (
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-lg ring-1 ring-inset ring-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                                        <img src={`${axios.defaults.baseURL.replace('/api', '')}/storage/images/${lec.image}`} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = `${axios.defaults.baseURL.replace('/api', '')}/storage/documents/${lec.image}`; }} />
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 bg-gradient-to-br from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 rounded-2xl flex items-center justify-center mb-4 text-pink-600 dark:text-pink-400 font-bold text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300 ring-1 ring-inset ring-pink-500/20">
                                        {lec.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <h3 className="font-black text-lg text-slate-800 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-3" title={lec.name}>{lec.name}</h3>
                                {lec.businesses.length > 0 && (
                                    <div className="flex flex-wrap gap-1 justify-center mt-1 mb-2">
                                        {lec.businesses.map((b, i) => <span key={i} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full">{b}</span>)}
                                    </div>
                                )}
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full uppercase tracking-wider mt-2 group-hover:bg-pink-50 dark:group-hover:bg-pink-500/10 transition-colors">
                                    View Lecturer Details
                                </p>
                            </div>
                        </div>
                    ))}"""
content = content.replace(lec_render_old, lec_render_new)

# Add edit functions for Lecturer and Tute
add_funcs = """
    const handleDeleteLecturer = async (oldName) => {
        if (!window.confirm(`Are you sure you want to delete ${oldName}?`)) return;
        setActionLoading(true);
        try {
            await axios.delete(`/api/lecturer/delete/${encodeURIComponent(oldName)}`);
            toast.success("Lecturer deleted");
            fetchGlobalStock();
        } catch { toast.error("Failed to delete"); }
        finally { setActionLoading(false); }
    };

    const handleLecSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const fd = new FormData();
            fd.append('oldName', lecFormData.oldName);
            fd.append('newName', lecFormData.newName);
            if (lecFormData.imageFile) fd.append('image', lecFormData.imageFile);
            await axios.put('/api/lecturer/update', fd);
            toast.success("Lecturer updated");
            setShowLecModal(false);
            fetchGlobalStock();
        } catch { toast.error("Failed to update lecturer"); }
        finally { setActionLoading(false); }
    };

    const handleTuteSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const fd = new FormData();
            fd.append('tuteName', tuteFormData.tuteName);
            fd.append('itemOrder', tuteFormData.itemOrder);
            if (tuteFormData.imageFile) fd.append('tuteImage', tuteFormData.imageFile);
            
            if (tuteFormData.id) {
                fd.append('id', tuteFormData.id);
                await axios.put('/api/edit-tute', fd);
                toast.success("Tute Updated");
            } else {
                if (!tuteFormData.courseId) return toast.error("Select a subject!");
                fd.append('courseId', tuteFormData.courseId);
                await axios.post('/api/create-tute', fd);
                toast.success("Tute Created");
            }
            setShowTuteModal(false);
            fetchGlobalStock();
        } catch { toast.error("Failed to save tute"); }
        finally { setActionLoading(false); }
    };
"""
content = content.replace("const handleAddStock = async (stockId) => {", add_funcs + "\n    const handleAddStock = async (stockId) => {")

# Update sorting in finalStocks
content = content.replace(
    "return lec === selectedLecturer && pg === selectedPaymentGroup && matchesSearch;",
    "return lec === selectedLecturer && pg === selectedPaymentGroup && matchesSearch;"
)
content = content.replace(
    "}, [globalStock, selectedLecturer, selectedPaymentGroup, searchQuery]);",
    "}).sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));\n    }, [globalStock, selectedLecturer, selectedPaymentGroup, searchQuery]);"
)

# Render buttons in Level 3 and Tute item Edit button
lvl3_header = """<div className="flex items-center gap-3">
                                <BookOpen className="text-pink-500 w-5 h-5" />
                                <span className="font-black text-rose-500">{selectedPaymentGroup}</span>
                            </div>"""
lvl3_header_new = """<div className="flex items-center gap-3">
                                <BookOpen className="text-pink-500 w-5 h-5" />
                                <span className="font-black text-rose-500">{selectedPaymentGroup}</span>
                            </div>
                            <div className="ml-auto flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Search tutes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-1.5 bg-white/5 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:border-pink-500 w-48 transition-all focus:w-64" />
                                </div>
                                {!isReadOnly && <button onClick={() => { setTuteFormData({ id: null, courseId: '', tuteName: '', itemOrder: 1, imageFile: null }); setShowTuteModal(true); }} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-1.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-pink-500/20 transition-all flex items-center gap-2"><Plus size={16}/> Add Tute</button>}
                            </div>"""
content = content.replace(lvl3_header, lvl3_header_new)

# Edit Tute button on item
tute_item = """<div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-0 ml-auto">"""
tute_item_new = """<div className="flex flex-col items-end gap-1"><span className="text-[10px] font-bold text-slate-400">Order: {stock.itemOrder || 1}</span></div><div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-0 ml-auto">"""
content = content.replace(tute_item, tute_item_new)

tute_delete_btn = """<button onClick={() => handleDeleteStock(stock.id)} className="p-2 bg-slate-200/50 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-colors">
                                            <Trash2 size={16} />
                                        </button>"""
tute_delete_btn_new = """<button onClick={() => { setTuteFormData({ id: stock.id, courseId: stock.courseId, tuteName: stock.tuteName, itemOrder: stock.itemOrder || 1, imageFile: null }); setShowTuteModal(true); }} className="p-2 bg-slate-200/50 hover:bg-amber-500/20 text-amber-600 rounded-xl transition-colors"><Edit3 size={16}/></button>
                                        <button onClick={() => handleDeleteStock(stock.id)} className="p-2 bg-slate-200/50 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-colors">
                                            <Trash2 size={16} />
                                        </button>"""
content = content.replace(tute_delete_btn, tute_delete_btn_new)
content = content.replace('axios.delete(`/admin/delivery/stock/delete/${stockId}?reason=${encodeURIComponent(reason)}`);', 'axios.delete(`/api/delete-tute/${stockId}`);')


# Add Modals HTML
modals_html = """
            {/* TUTE MODAL */}
            {showTuteModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTuteModal(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">{tuteFormData.id ? "Edit Tute" : "Create New Tute"}</h3>
                            <button onClick={() => setShowTuteModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                            <form id="tuteForm" onSubmit={handleTuteSubmit} className="space-y-4">
                                {!tuteFormData.id && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Subject (Course) *</label>
                                        <select required value={tuteFormData.courseId} onChange={e => setTuteFormData(p => ({...p, courseId: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-pink-500 transition-colors text-slate-800 dark:text-slate-200">
                                            <option value="">Select a subject</option>
                                            {Array.from(new Set(globalStock.filter(s => {
                                                const lec = s.course?.lecturerName || "Unknown Lecturer";
                                                const pg = s.course?.group?.type === 1 ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Unknown';
                                                return lec === selectedLecturer && pg === selectedPaymentGroup;
                                            }).map(s => s.course))).filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i).map(c => (
                                                <option key={c.id} value={c.id}>{c.name} - {c.group?.batch?.business?.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tute Name *</label>
                                    <input type="text" required value={tuteFormData.tuteName} onChange={e => setTuteFormData(p => ({...p, tuteName: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-pink-500 transition-colors text-slate-800 dark:text-slate-200" placeholder="e.g. Tute 01 - Intro" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Item Order (Sorting)</label>
                                    <input type="number" required value={tuteFormData.itemOrder} onChange={e => setTuteFormData(p => ({...p, itemOrder: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-pink-500 transition-colors text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tute Cover Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setTuteFormData(p => ({...p, imageFile: e.target.files[0]}))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-pink-500 transition-colors text-slate-800 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                                </div>
                            </form>
                        </div>
                        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <button form="tuteForm" type="submit" disabled={actionLoading} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (tuteFormData.id ? "Save Changes" : "Create Tute")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* LECTURER MODAL */}
            {showLecModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLecModal(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">Edit Lecturer</h3>
                            <button onClick={() => setShowLecModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                            <form id="lecForm" onSubmit={handleLecSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Lecturer Name *</label>
                                    <input type="text" required value={lecFormData.newName} onChange={e => setLecFormData(p => ({...p, newName: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-pink-500 transition-colors text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Profile Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setLecFormData(p => ({...p, imageFile: e.target.files[0]}))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-pink-500 transition-colors text-slate-800 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                                </div>
                            </form>
                        </div>
                        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <button form="lecForm" type="submit" disabled={actionLoading} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
"""

content = content.replace("</div>\n    );\n}", modals_html + "\n        </div>\n    );\n}")

with open('/root/IMA-Campus/frontend/src/pages/delivery/components/TuteStock.jsx', 'w') as f:
    f.write(content)

