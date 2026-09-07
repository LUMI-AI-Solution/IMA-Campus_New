import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BookOpen, Upload, Plus, Trash2, Edit3, Eye, Download, Search,
  Filter, Layers, CheckCircle2, X, RefreshCw, BarChart2, FileText,
  Tag, Globe, Folder, Award, Settings, GraduationCap, ArrowRight,
  AlertCircle
} from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'PAST_PAPER', label: 'Past Paper' },
  { value: 'MODEL_PAPER', label: 'Model Examination Paper' },
  { value: 'TEACHERS_GUIDE', label: 'Teachers’ Resource Guide' },
  { value: 'SHORT_NOTE', label: 'Short Note / Student Handout' },
  { value: 'TERM_TEST', label: 'Term Test Paper' }
];

export default function LibraryManager() {
  const [activeTab, setActiveTab] = useState('RESOURCES'); // 'RESOURCES' | 'STRUCTURE' | 'ANALYTICS'
  const [structureSubTab, setStructureSubTab] = useState('CATEGORIES'); // 'CATEGORIES' | 'GRADES' | 'STREAMS' | 'SUBJECTS'

  // Data states
  const [categories, setCategories] = useState([]);
  const [grades, setGrades] = useState([]);
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter in Admin table
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCatFilter, setAdminCatFilter] = useState('ALL');
  const [adminTypeFilter, setAdminTypeFilter] = useState('ALL');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [staffPreviewResource, setStaffPreviewResource] = useState(null);

  // Structure CRUD Modals
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Structure Forms
  const [catForm, setCatForm] = useState({ id: null, name: '', code: '', description: '', sortOrder: 0 });
  const [gradeForm, setGradeForm] = useState({ id: null, name: '', gradeNumber: '', categoryId: '', sortOrder: 0 });
  const [streamForm, setStreamForm] = useState({ id: null, name: '', code: '', description: '', categoryId: '', sortOrder: 0 });
  const [subjectForm, setSubjectForm] = useState({ id: null, name: '', code: '', categoryId: '', streamId: '', gradeId: '', sortOrder: 0 });

  // Upload Form State (NO YEAR FIELD)
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    resourceType: 'PAST_PAPER',
    medium: 'SINHALA',
    tags: '',
    categoryId: '',
    gradeId: '',
    streamId: '',
    subjectId: '',
    isFeatured: false,
    hasMarkingScheme: false
  });
  const [paperFile, setPaperFile] = useState(null);
  const [markingSchemeFile, setMarkingSchemeFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch Structure & Resources
  const fetchData = async () => {
    setLoading(true);
    try {
      const [structRes, resRes, anaRes] = await Promise.all([
        axios.get('/api/library/admin/structure').catch(() => ({ data: {} })),
        axios.get('/api/library/resources', { params: { limit: 100 } }).catch(() => ({ data: {} })),
        axios.get('/api/library/admin/analytics').catch(() => ({ data: {} }))
      ]);

      if (structRes.data?.categories) setCategories(structRes.data.categories);
      if (structRes.data?.grades) setGrades(structRes.data.grades);
      if (structRes.data?.streams) setStreams(structRes.data.streams);
      if (structRes.data?.subjects) setSubjects(structRes.data.subjects);
      if (resRes.data?.resources) setResources(resRes.data.resources);
      if (anaRes.data?.analytics) setAnalytics(anaRes.data.analytics);
    } catch (err) {
      console.error("Error loading library admin data:", err);
      toast.error("Failed to load library data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle PDF Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!paperFile) {
      toast.error("Please select a PDF document to upload");
      return;
    }
    if (!uploadFormData.title) {
      toast.error("Please enter a title");
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('paper', paperFile);
    if (markingSchemeFile) data.append('markingScheme', markingSchemeFile);

    Object.keys(uploadFormData).forEach(key => {
      if (uploadFormData[key] !== undefined && uploadFormData[key] !== null && uploadFormData[key] !== '') {
        data.append(key, uploadFormData[key]);
      }
    });

    try {
      const res = await axios.post('/api/library/admin/resources/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        toast.success("Document uploaded successfully to Vault!");
        setIsUploadModalOpen(false);
        setPaperFile(null);
        setMarkingSchemeFile(null);
        setUploadFormData({
          title: '',
          description: '',
          resourceType: 'PAST_PAPER',
          medium: 'SINHALA',
          tags: '',
          categoryId: '',
          gradeId: '',
          streamId: '',
          subjectId: '',
          isFeatured: false,
          hasMarkingScheme: false
        });
        fetchData();
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingResource) return;

    try {
      const res = await axios.put(`/api/library/admin/resources/${editingResource.id}`, editingResource);
      if (res.data?.success) {
        toast.success("Resource updated successfully");
        setIsEditModalOpen(false);
        setEditingResource(null);
        fetchData();
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update resource");
    }
  };

  // Handle Delete Resource
  const handleDeleteResource = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/library/admin/resources/${id}`);
      if (res.data?.success) {
        toast.success("Resource deleted successfully");
        fetchData();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete resource");
    }
  };

  // --- Category CRUD ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await axios.put(`/api/library/admin/categories/${catForm.id}`, catForm);
        toast.success("Category updated");
      } else {
        await axios.post('/api/library/admin/categories', catForm);
        toast.success("Category created");
      }
      setIsCatModalOpen(false);
      setCatForm({ id: null, name: '', code: '', description: '', sortOrder: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? Any linked resources may be affected.`)) return;
    try {
      await axios.delete(`/api/library/admin/categories/${id}`);
      toast.success("Category deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  // --- Grade CRUD ---
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    try {
      if (gradeForm.id) {
        await axios.put(`/api/library/admin/grades/${gradeForm.id}`, gradeForm);
        toast.success("Grade updated");
      } else {
        await axios.post('/api/library/admin/grades', gradeForm);
        toast.success("Grade created");
      }
      setIsGradeModalOpen(false);
      setGradeForm({ id: null, name: '', gradeNumber: '', categoryId: '', sortOrder: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save grade");
    }
  };

  const handleDeleteGrade = async (id, name) => {
    if (!window.confirm(`Delete grade "${name}"?`)) return;
    try {
      await axios.delete(`/api/library/admin/grades/${id}`);
      toast.success("Grade deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete grade");
    }
  };

  // --- Stream CRUD ---
  const handleSaveStream = async (e) => {
    e.preventDefault();
    try {
      if (streamForm.id) {
        await axios.put(`/api/library/admin/streams/${streamForm.id}`, streamForm);
        toast.success("Stream updated");
      } else {
        await axios.post('/api/library/admin/streams', streamForm);
        toast.success("Stream created");
      }
      setIsStreamModalOpen(false);
      setStreamForm({ id: null, name: '', code: '', description: '', categoryId: '', sortOrder: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save stream");
    }
  };

  const handleDeleteStream = async (id, name) => {
    if (!window.confirm(`Delete stream "${name}"?`)) return;
    try {
      await axios.delete(`/api/library/admin/streams/${id}`);
      toast.success("Stream deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete stream");
    }
  };

  // --- Subject CRUD ---
  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      if (subjectForm.id) {
        await axios.put(`/api/library/admin/subjects/${subjectForm.id}`, subjectForm);
        toast.success("Subject updated");
      } else {
        await axios.post('/api/library/admin/subjects', subjectForm);
        toast.success("Subject created");
      }
      setIsSubjectModalOpen(false);
      setSubjectForm({ id: null, name: '', code: '', categoryId: '', streamId: '', gradeId: '', sortOrder: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save subject");
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await axios.delete(`/api/library/admin/subjects/${id}`);
      toast.success("Subject deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete subject");
    }
  };

  // Filtered resources in Admin Table
  const filteredAdminResources = resources.filter(r => {
    if (adminCatFilter !== 'ALL' && r.categoryId !== parseInt(adminCatFilter)) return false;
    if (adminTypeFilter !== 'ALL' && r.resourceType !== adminTypeFilter) return false;
    if (adminSearch.trim() !== '') {
      const q = adminSearch.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.subject?.name?.toLowerCase().includes(q) ||
        r.tags?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0d131f] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* ========================================================
          PAGE HEADER
      ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <BookOpen size={26} className="text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                IMA Pusthakalaya Management
              </h1>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Staff Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload past papers, model papers, teachers' guides, and configure custom categories, grades & subjects.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer"
          >
            <Upload size={15} /> Upload New PDF
          </button>
        </div>
      </div>

      {/* ========================================================
          KPI METRIC CARDS
      ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Documents</p>
            <p className="text-xl font-black text-white">{analytics?.totalResources || resources.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Download size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Downloads</p>
            <p className="text-xl font-black text-emerald-400">{analytics?.totalDownloads || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Categories & Streams</p>
            <p className="text-xl font-black text-purple-400">{categories.length} / {streams.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Subjects</p>
            <p className="text-xl font-black text-amber-400">{subjects.length}</p>
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN TABS NAVIGATION
      ======================================================== */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'RESOURCES'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={14} /> Documents Repository
        </button>

        <button
          onClick={() => setActiveTab('STRUCTURE')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'STRUCTURE'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={14} /> Categories, Grades & Streams (Structure CRUD)
        </button>
      </div>

      {/* ========================================================
          TAB 1: RESOURCES REPOSITORY
      ======================================================== */}
      {activeTab === 'RESOURCES' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[240px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search uploaded documents by title, subject, tags..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={adminCatFilter}
                onChange={(e) => setAdminCatFilter(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                value={adminTypeFilter}
                onChange={(e) => setAdminTypeFilter(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Resource Types</option>
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-400">
              Showing {filteredAdminResources.length} of {resources.length}
            </span>
          </div>

          {/* Documents Table */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-4">Title & Details</th>
                    <th className="p-4">Category / Stream</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Medium</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Downloads</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-slate-400">Loading documents repository...</td>
                    </tr>
                  ) : filteredAdminResources.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center p-10 text-slate-400">
                        <FileText size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="font-bold text-slate-300">No documents in repository yet.</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Upload New PDF" to publish your first past paper or teachers' guide.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAdminResources.map(res => (
                      <tr key={res.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 max-w-xs">
                          <p className="font-bold text-white truncate" title={res.title}>{res.title}</p>
                          {res.hasMarkingScheme && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                              <CheckCircle2 size={10} /> Scheme Included
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-300">{res.category?.name || 'General'}</p>
                          <p className="text-[10px] text-slate-500">{res.stream?.name || res.grade?.name || '-'}</p>
                        </td>
                        <td className="p-4 font-bold text-amber-300">
                          {res.subject?.name || '-'}
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 text-slate-200 uppercase">
                            {res.resourceType?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {res.medium}
                        </td>
                        <td className="p-4 text-slate-400">{res.fileSize || '-'}</td>
                        <td className="p-4 text-emerald-400 font-bold">{res.downloadCount || 0}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Button */}
                            <button
                              onClick={() => setStaffPreviewResource(res)}
                              title="Preview PDF"
                              className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Eye size={13} />
                            </button>
                            {/* Edit Button */}
                            <button
                              onClick={() => { setEditingResource(res); setIsEditModalOpen(true); }}
                              title="Edit Details"
                              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteResource(res.id, res.title)}
                              title="Delete"
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          TAB 2: STRUCTURE MANAGEMENT (FULL CRUD)
      ======================================================== */}
      {activeTab === 'STRUCTURE' && (
        <div className="space-y-4">
          
          {/* Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-white/10">
            <button
              onClick={() => setStructureSubTab('CATEGORIES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                structureSubTab === 'CATEGORIES' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setStructureSubTab('GRADES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                structureSubTab === 'GRADES' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Grades 1-13 ({grades.length})
            </button>
            <button
              onClick={() => setStructureSubTab('STREAMS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                structureSubTab === 'STREAMS' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Academic Streams ({streams.length})
            </button>
            <button
              onClick={() => setStructureSubTab('SUBJECTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                structureSubTab === 'SUBJECTS' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Subjects ({subjects.length})
            </button>
          </div>

          {/* --- SUBTAB: CATEGORIES --- */}
          {structureSubTab === 'CATEGORIES' && (
            <div className="bg-slate-900/80 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Categories Repository</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Top-level academic groupings e.g. G.C.E. A/L, G.C.E. O/L, Primary</p>
                </div>
                <button
                  onClick={() => {
                    setCatForm({ id: null, name: '', code: '', description: '', sortOrder: categories.length + 1 });
                    setIsCatModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus size={14} /> Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {categories.length === 0 ? (
                  <div className="col-span-full text-center p-8 text-slate-500 text-xs">No categories created yet. Click "+ Add Category" to start.</div>
                ) : (
                  categories.map(c => (
                    <div key={c.id} className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-xs">{c.name} <span className="text-[10px] text-amber-400 font-mono">[{c.code}]</span></p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{c.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setCatForm({ id: c.id, name: c.name, code: c.code, description: c.description || '', sortOrder: c.sortOrder || 0 });
                            setIsCatModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- SUBTAB: GRADES --- */}
          {structureSubTab === 'GRADES' && (
            <div className="bg-slate-900/80 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Grades (1 - 13)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Allocate grades into categories or keep them isolated</p>
                </div>
                <button
                  onClick={() => {
                    setGradeForm({ id: null, name: '', gradeNumber: '', categoryId: '', sortOrder: grades.length + 1 });
                    setIsGradeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus size={14} /> Add Grade
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {grades.length === 0 ? (
                  <div className="col-span-full text-center p-8 text-slate-500 text-xs">No grades created yet. Click "+ Add Grade" to start.</div>
                ) : (
                  grades.map(g => (
                    <div key={g.id} className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-xs">{g.name}</p>
                        <span className="text-[10px] text-amber-400/90 font-bold bg-amber-400/10 px-2 py-0.5 rounded mt-1 inline-block">
                          Category: {g.category?.name || 'Isolated (No Category)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setGradeForm({ id: g.id, name: g.name, gradeNumber: g.gradeNumber || '', categoryId: g.categoryId || '', sortOrder: g.sortOrder || 0 });
                            setIsGradeModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteGrade(g.id, g.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- SUBTAB: STREAMS --- */}
          {structureSubTab === 'STREAMS' && (
            <div className="bg-slate-900/80 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Academic Streams</h3>
                  <p className="text-xs text-slate-400 mt-0.5">e.g. Physical Science (Maths), Bio Science, Commerce, Arts, Tech</p>
                </div>
                <button
                  onClick={() => {
                    setStreamForm({ id: null, name: '', code: '', description: '', categoryId: '', sortOrder: streams.length + 1 });
                    setIsStreamModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus size={14} /> Add Stream
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {streams.length === 0 ? (
                  <div className="col-span-full text-center p-8 text-slate-500 text-xs">No streams created yet. Click "+ Add Stream" to start.</div>
                ) : (
                  streams.map(s => (
                    <div key={s.id} className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-xs">{s.name}</p>
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-400/10 px-2 py-0.5 rounded mt-1 inline-block">
                          Category: {s.category?.name || 'General'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setStreamForm({ id: s.id, name: s.name, code: s.code || '', description: s.description || '', categoryId: s.categoryId || '', sortOrder: s.sortOrder || 0 });
                            setIsStreamModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteStream(s.id, s.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- SUBTAB: SUBJECTS --- */}
          {structureSubTab === 'SUBJECTS' && (
            <div className="bg-slate-900/80 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Subjects Master</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Map subjects to Category, Stream, and/or Grade</p>
                </div>
                <button
                  onClick={() => {
                    setSubjectForm({ id: null, name: '', code: '', categoryId: '', streamId: '', gradeId: '', sortOrder: subjects.length + 1 });
                    setIsSubjectModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus size={14} /> Add Subject
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {subjects.length === 0 ? (
                  <div className="col-span-full text-center p-8 text-slate-500 text-xs">No subjects created yet. Click "+ Add Subject" to start.</div>
                ) : (
                  subjects.map(sub => (
                    <div key={sub.id} className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-xs">{sub.name}</p>
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                          {sub.stream?.name || sub.category?.name || 'General Subject'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setSubjectForm({ id: sub.id, name: sub.name, code: sub.code || '', categoryId: sub.categoryId || '', streamId: sub.streamId || '', gradeId: sub.gradeId || '', sortOrder: sub.sortOrder || 0 });
                            setIsSubjectModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          UPLOAD MODAL (NO YEAR FIELD)
      ======================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-white/10 shadow-2xl space-y-5 my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Upload size={18} className="text-amber-400" /> Upload New Past Paper / Guide PDF
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                  placeholder="e.g. Combined Maths Model Paper 01 + Marking Scheme"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Resource Type & Medium */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Resource Type *</label>
                  <select
                    value={uploadFormData.resourceType}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, resourceType: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Medium</label>
                  <select
                    value={uploadFormData.medium}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, medium: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="SINHALA">Sinhala</option>
                    <option value="ENGLISH">English</option>
                    <option value="TAMIL">Tamil</option>
                  </select>
                </div>
              </div>

              {/* Category, Grade & Stream */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={uploadFormData.categoryId}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Grade</label>
                  <select
                    value={uploadFormData.gradeId}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, gradeId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select Grade</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Stream</label>
                  <select
                    value={uploadFormData.streamId}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, streamId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select Stream</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
                <select
                  value={uploadFormData.subjectId}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, subjectId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
              </div>

              {/* PDF File Picker */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-dashed border-amber-400/40 text-center space-y-2">
                <FileText size={28} className="text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-white">Select PDF Document *</p>
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setPaperFile(e.target.files[0])}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-400 file:text-slate-950 cursor-pointer"
                />
              </div>

              {/* Optional Marking Scheme File */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-300">Separate Marking Scheme PDF (Optional):</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setMarkingSchemeFile(e.target.files[0])}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-white/20 file:text-white cursor-pointer"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Search Tags (Comma separated)</label>
                <input
                  type="text"
                  value={uploadFormData.tags}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, tags: e.target.value })}
                  placeholder="e.g. Combined Maths, Model Paper, Marking Scheme"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg cursor-pointer flex items-center gap-2"
                >
                  {uploading ? 'Uploading...' : 'Publish to Vault'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================
          CATEGORY MODAL
      ======================================================== */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white">{catForm.id ? 'Edit Category' : 'Create New Category'}</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. G.C.E. Advanced Level"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category Code *</label>
                <input
                  type="text"
                  required
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                  placeholder="e.g. AL"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Brief description"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          GRADE MODAL
      ======================================================== */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white">{gradeForm.id ? 'Edit Grade' : 'Create New Grade'}</h3>
              <button onClick={() => setIsGradeModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveGrade} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Grade Name *</label>
                <input
                  type="text"
                  required
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  placeholder="e.g. Grade 12"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Grade Number (1 - 13)</label>
                <input
                  type="number"
                  min="1"
                  max="13"
                  value={gradeForm.gradeNumber}
                  onChange={(e) => setGradeForm({ ...gradeForm, gradeNumber: e.target.value })}
                  placeholder="e.g. 12"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Allocate to Category (Optional)</label>
                <select
                  value={gradeForm.categoryId}
                  onChange={(e) => setGradeForm({ ...gradeForm, categoryId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Isolated Grade (No Category)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsGradeModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">Save Grade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          STREAM MODAL
      ======================================================== */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white">{streamForm.id ? 'Edit Stream' : 'Create New Stream'}</h3>
              <button onClick={() => setIsStreamModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStream} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stream Name *</label>
                <input
                  type="text"
                  required
                  value={streamForm.name}
                  onChange={(e) => setStreamForm({ ...streamForm, name: e.target.value })}
                  placeholder="e.g. Physical Science (Maths)"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stream Code</label>
                <input
                  type="text"
                  value={streamForm.code}
                  onChange={(e) => setStreamForm({ ...streamForm, code: e.target.value })}
                  placeholder="e.g. MATHS"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Allocate to Category</label>
                <select
                  value={streamForm.categoryId}
                  onChange={(e) => setStreamForm({ ...streamForm, categoryId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsStreamModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">Save Stream</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBJECT MODAL
      ======================================================== */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white">{subjectForm.id ? 'Edit Subject' : 'Create New Subject'}</h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Combined Mathematics"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subject Code</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="e.g. CMATHS"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={subjectForm.categoryId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, categoryId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Stream (Optional)</label>
                <select
                  value={subjectForm.streamId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, streamId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select Stream</option>
                  {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          STAFF EMBEDDED IFRAME PREVIEW MODAL
      ======================================================== */}
      {staffPreviewResource && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">
            
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between gap-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950 uppercase mr-2">
                  {staffPreviewResource.resourceType}
                </span>
                <span className="text-sm font-black text-white">{staffPreviewResource.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={staffPreviewResource.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  onClick={() => setStaffPreviewResource(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 relative">
              <iframe
                src={`${staffPreviewResource.fileUrl}#toolbar=1&navpanes=0`}
                title={staffPreviewResource.title}
                className="w-full h-full border-none"
              />
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          EDIT RESOURCE MODAL
      ======================================================== */}
      {isEditModalOpen && editingResource && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Edit3 size={16} className="text-amber-400" /> Edit Resource Details
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingResource.title || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Medium</label>
                <select
                  value={editingResource.medium || 'SINHALA'}
                  onChange={(e) => setEditingResource({ ...editingResource, medium: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="SINHALA">Sinhala</option>
                  <option value="ENGLISH">English</option>
                  <option value="TAMIL">Tamil</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tags</label>
                <input
                  type="text"
                  value={editingResource.tags || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, tags: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
