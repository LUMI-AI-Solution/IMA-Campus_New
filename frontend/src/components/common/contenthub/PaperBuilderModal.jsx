import React, { useState, useEffect } from 'react';
import { 
  X, Save, Plus, Trash2, CheckCircle2, Clock, Calendar, 
  FileText, CheckCircle, Users, Award, AlertCircle, FileSignature, 
  HelpCircle, Sparkles, ChevronRight, Eye, RefreshCw, UploadCloud, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function PaperBuilderModal({ content, isOpen, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'settings' | 'submissions'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Paper config
  const [paperId, setPaperId] = useState(null);
  const [paperType, setPaperType] = useState('MCQ'); // 'MCQ' | 'STRUCTURED'
  const [timerMode, setTimerMode] = useState('FLEXIBLE'); // 'SCHEDULED' | 'FLEXIBLE'
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(40);
  const [instructions, setInstructions] = useState('');

  // MCQ Questions list
  const [questions, setQuestions] = useState([]);

  // Submissions list
  const [submissions, setSubmissions] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  useEffect(() => {
    if (isOpen && content?.id) {
      fetchPaperDetails();
    }
  }, [isOpen, content?.id]);

  const fetchPaperDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/papers/content/${content.id}`);
      const p = res.data?.paper;
      if (p) {
        setPaperId(p.id);
        setPaperType(p.paperType || (content.contentType === 'sPaper' ? 'STRUCTURED' : 'MCQ'));
        setTimerMode(p.timerMode || 'FLEXIBLE');
        setScheduledStartTime(p.scheduledStartTime ? p.scheduledStartTime.substring(0, 16) : '');
        setDurationMinutes(p.durationMinutes || content.paperTime || 60);
        setTotalMarks(p.totalMarks || 100);
        setPassMarks(p.passMarks || 40);
        setInstructions(p.instructions || '');

        if (p.questions && p.questions.length > 0) {
          setQuestions(p.questions.map(q => ({
            id: q.id,
            questionNo: q.questionNo,
            questionText: q.questionText,
            image: q.image || '',
            marks: q.marks || 1,
            options: q.options && q.options.length > 0 ? q.options.map(opt => ({
              id: opt.id,
              optionNo: opt.optionNo,
              optionText: opt.optionText,
              isCorrect: Boolean(opt.isCorrect)
            })) : [
              { optionNo: 1, optionText: '', isCorrect: true },
              { optionNo: 2, optionText: '', isCorrect: false },
              { optionNo: 3, optionText: '', isCorrect: false },
              { optionNo: 4, optionText: '', isCorrect: false },
              { optionNo: 5, optionText: '', isCorrect: false }
            ]
          })));
        } else {
          // Initialize with 1 default question
          setQuestions([
            {
              questionNo: 1,
              questionText: '',
              image: '',
              marks: 1,
              options: [
                { optionNo: 1, optionText: '', isCorrect: true },
                { optionNo: 2, optionText: '', isCorrect: false },
                { optionNo: 3, optionText: '', isCorrect: false },
                { optionNo: 4, optionText: '', isCorrect: false },
                { optionNo: 5, optionText: '', isCorrect: false }
              ]
            }
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load paper details", err);
      toast.error("Failed to load paper settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!paperId) return;
    try {
      const res = await api.get(`/papers/${paperId}/submissions`);
      setSubmissions(res.data?.submissions || []);
    } catch (err) {
      console.error("Failed to load submissions", err);
      toast.error("Failed to load student submissions");
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions' && paperId) {
      fetchSubmissions();
    }
  }, [activeTab, paperId]);

  // Handle Save Settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        contentId: content.id,
        paperType,
        timerMode,
        scheduledStartTime: timerMode === 'SCHEDULED' && scheduledStartTime ? scheduledStartTime : null,
        durationMinutes: parseInt(durationMinutes || 60),
        totalMarks: parseFloat(totalMarks || 100),
        passMarks: parseFloat(passMarks || 40),
        instructions
      };

      const res = await api.post('/papers/config', payload);
      setPaperId(res.data.paper.id);
      toast.success("Paper settings updated!");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Failed to save settings", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Questions (MCQ)
  const handleSaveQuestions = async () => {
    if (!paperId) {
      await handleSaveSettings();
    }
    setSaving(true);
    try {
      // Validate questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText.trim()) {
          toast.error(`Question ${i + 1} cannot have empty question text.`);
          setSaving(false);
          return;
        }
        const hasCorrect = q.options.some(opt => opt.isCorrect);
        if (!hasCorrect) {
          toast.error(`Question ${i + 1} must have at least one correct option selected.`);
          setSaving(false);
          return;
        }
      }

      await api.post('/papers/questions', {
        paperId: paperId,
        questions: questions
      });

      toast.success("All questions saved successfully!");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Failed to save questions", err);
      toast.error("Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  // Question Management Helpers
  const addQuestion = () => {
    const nextNo = questions.length + 1;
    setQuestions([
      ...questions,
      {
        questionNo: nextNo,
        questionText: '',
        image: '',
        marks: 1,
        options: [
          { optionNo: 1, optionText: '', isCorrect: true },
          { optionNo: 2, optionText: '', isCorrect: false },
          { optionNo: 3, optionText: '', isCorrect: false },
          { optionNo: 4, optionText: '', isCorrect: false },
          { optionNo: 5, optionText: '', isCorrect: false }
        ]
      }
    ]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) {
      toast.error("Paper must have at least one question.");
      return;
    }
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, questionNo: i + 1 }));
    setQuestions(updated);
  };

  const updateQuestionText = (idx, text) => {
    const updated = [...questions];
    updated[idx].questionText = text;
    setQuestions(updated);
  };

  const updateOptionText = (qIdx, optIdx, text) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx].optionText = text;
    setQuestions(updated);
  };

  const setCorrectOption = (qIdx, optIdx) => {
    const updated = [...questions];
    updated[qIdx].options.forEach((opt, idx) => {
      opt.isCorrect = idx === optIdx;
    });
    setQuestions(updated);
  };

  const addOptionToQuestion = (qIdx) => {
    const updated = [...questions];
    if (updated[qIdx].options.length >= 5) {
      toast.error("Maximum 5 answers allowed per question.");
      return;
    }
    const nextOptNo = updated[qIdx].options.length + 1;
    updated[qIdx].options.push({
      optionNo: nextOptNo,
      optionText: '',
      isCorrect: false
    });
    setQuestions(updated);
  };

  const removeOptionFromQuestion = (qIdx, optIdx) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) {
      toast.error("At least 2 options required per question.");
      return;
    }
    const wasCorrect = updated[qIdx].options[optIdx].isCorrect;
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== optIdx).map((opt, i) => ({ ...opt, optionNo: i + 1 }));
    if (wasCorrect && updated[qIdx].options.length > 0) {
      updated[qIdx].options[0].isCorrect = true;
    }
    setQuestions(updated);
  };

  // Grade Structured Submission
  const handleGradeSubmit = async () => {
    if (!gradingSubmission) return;
    try {
      await api.put(`/papers/submissions/${gradingSubmission.id}/grade`, {
        score: parseFloat(gradeScore || 0),
        teacherFeedback: gradeFeedback
      });
      toast.success("Submission graded successfully!");
      setGradingSubmission(null);
      fetchSubmissions();
    } catch (err) {
      toast.error("Failed to grade submission");
    }
  };

  if (!isOpen) return null;

  const getBaseUrl = () => {
    let baseApiUrl = (api.defaults && api.defaults.baseURL) 
      ? api.defaults.baseURL.replace('/api', '') 
      : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
    return baseApiUrl || 'http://localhost:5000';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#090E17]/95 border border-white/10 rounded-2xl sm:rounded-[2rem] w-full max-w-7xl h-[92vh] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap justify-between items-center gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${paperType === 'MCQ' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
              {paperType === 'MCQ' ? <CheckCircle size={24} /> : <FileSignature size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
                  {paperType === 'MCQ' ? 'MCQ Exam Engine' : 'Structured Paper Engine'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${timerMode === 'SCHEDULED' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {timerMode === 'SCHEDULED' ? '⏰ Scheduled Start' : '⚡ Flexible Start'}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1 drop-shadow-sm truncate max-w-[500px]">
                {content?.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'questions' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                {paperType === 'MCQ' ? `Questions (${questions.length})` : 'Paper Info'}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'settings' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Timer & Rules
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'submissions' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Submissions
              </button>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-white bg-white/5 border border-white/10 p-2.5 rounded-xl transition-all hover:bg-red-500/20 outline-none">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <RefreshCw className="animate-spin text-brand-accent" size={32} />
              <p className="text-slate-400 text-sm font-semibold">Loading paper data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: QUESTIONS BUILDER (MCQ) */}
              {activeTab === 'questions' && (
                paperType === 'MCQ' ? (
                  <div className="space-y-6 max-w-5xl mx-auto">
                    <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <HelpCircle className="text-green-400" size={18} /> MCQ Questions Builder
                        </h3>
                        <p className="text-xs text-slate-400">
                          Add questions with up to 5 answers. Click the radio button next to an option to mark it as the correct answer.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addQuestion}
                          className="bg-green-600 hover:bg-green-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-green-600/30 transition-all active:scale-95"
                        >
                          <Plus size={16} /> Add Question
                        </button>
                        <button
                          onClick={handleSaveQuestions}
                          disabled={saving}
                          className="bg-brand-accent hover:bg-brand-accent/90 text-white font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                        >
                          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Save All Questions
                        </button>
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-6">
                      {questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 relative group shadow-lg">
                          
                          {/* Question Header */}
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 flex items-center justify-center font-black text-sm">
                                #{qIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Question {qIdx + 1} of {questions.length}
                              </span>
                            </div>
                            <button
                              onClick={() => removeQuestion(qIdx)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all text-xs font-bold flex items-center gap-1"
                              title="Delete this question"
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          </div>

                          {/* Question Text */}
                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                              Question Text *
                            </label>
                            <textarea
                              rows={3}
                              value={q.questionText}
                              onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                              placeholder={`Type Question ${qIdx + 1} details here...`}
                              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all resize-y"
                            />
                          </div>

                          {/* Options / Answers */}
                          <div className="space-y-2.5 pt-2">
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                              Options (Answers) - <span className="text-green-400 font-normal">Select the radio icon for the correct answer:</span>
                            </label>
                            
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <div 
                                  key={optIdx} 
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${opt.isCorrect ? 'bg-green-500/10 border-green-500/40 shadow-inner' : 'bg-black/30 border-white/5 hover:border-white/15'}`}
                                >
                                  {/* Radio button for Correct Answer */}
                                  <button
                                    type="button"
                                    onClick={() => setCorrectOption(qIdx, optIdx)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-green-500 text-black font-black shadow-md shadow-green-500/40 scale-105' : 'bg-white/5 text-slate-500 border border-white/10 hover:border-green-500/50'}`}
                                    title={opt.isCorrect ? "Correct Answer" : "Click to set as Correct Answer"}
                                  >
                                    {opt.isCorrect ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{optIdx + 1}</span>}
                                  </button>

                                  <input
                                    type="text"
                                    value={opt.optionText}
                                    onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                    placeholder={`Answer Option ${optIdx + 1}...`}
                                    className="flex-1 bg-transparent border-0 text-sm text-white placeholder-slate-600 outline-none"
                                  />

                                  {opt.isCorrect && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/20 px-2 py-0.5 rounded-md">
                                      Correct
                                    </span>
                                  )}

                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOptionFromQuestion(qIdx, optIdx)}
                                      className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                                      title="Remove option"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {q.options.length < 5 && (
                              <button
                                type="button"
                                onClick={() => addOptionToQuestion(qIdx)}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2 pl-1"
                              >
                                <Plus size={14} /> Add 5th Answer Option
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/10 sticky bottom-0 z-20 backdrop-blur-md">
                      <button
                        onClick={addQuestion}
                        className="bg-white/10 hover:bg-white/20 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all"
                      >
                        <Plus size={16} /> Add Another Question
                      </button>
                      <button
                        onClick={handleSaveQuestions}
                        disabled={saving}
                        className="bg-brand-accent hover:bg-brand-accent/90 text-white font-extrabold px-8 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                      >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Save All Questions ({questions.length})
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STRUCTURED PAPER INFO */
                  <div className="max-w-3xl mx-auto bg-black/40 border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <FileSignature size={28} className="text-purple-400" />
                      <div>
                        <h3 className="text-lg font-bold text-white">Structured Paper Master Sheet</h3>
                        <p className="text-xs text-slate-400">Students will download or view the question paper PDF and upload their answered PDF or photo captures.</p>
                      </div>
                    </div>

                    {content.fileName ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText size={24} className="text-yellow-400" />
                          <div>
                            <p className="text-sm font-bold text-white">{content.fileName}</p>
                            <p className="text-xs text-slate-400">Master Question PDF</p>
                          </div>
                        </div>
                        <a 
                          href={`${getBaseUrl()}/storage/documents/${content.fileName}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          download
                          className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Download size={14} /> Download PDF
                        </a>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-sm font-semibold text-slate-400">No question sheet PDF uploaded yet. Edit this content to upload the master PDF file.</p>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* TAB 2: TIMER & SETTINGS */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl mx-auto bg-black/40 border border-white/10 rounded-2xl p-6 sm:p-8">
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                    <Clock className="text-blue-400" size={20} /> Exam Timer & Examination Rules
                  </h3>

                  {/* Timer Mode Selection */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Timer Mode *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Scheduled Start */}
                      <label 
                        onClick={() => setTimerMode('SCHEDULED')}
                        className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col gap-2 ${timerMode === 'SCHEDULED' ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10' : 'bg-black/30 border-white/10 hover:border-white/20'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-white text-sm">
                            <Calendar size={18} className="text-amber-400" /> Scheduled Start
                          </div>
                          <input type="radio" checked={timerMode === 'SCHEDULED'} onChange={() => setTimerMode('SCHEDULED')} className="accent-amber-500" />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Everyone starts at the exact same scheduled date and time. Shows a live countdown for all students simultaneously.
                        </p>
                      </label>

                      {/* Flexible Start */}
                      <label 
                        onClick={() => setTimerMode('FLEXIBLE')}
                        className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col gap-2 ${timerMode === 'FLEXIBLE' ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/10' : 'bg-black/30 border-white/10 hover:border-white/20'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-white text-sm">
                            <Sparkles size={18} className="text-blue-400" /> Flexible Start
                          </div>
                          <input type="radio" checked={timerMode === 'FLEXIBLE'} onChange={() => setTimerMode('FLEXIBLE')} className="accent-blue-500" />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Students can start whenever they open the paper. The countdown starts independently from the moment they click "Start Exam".
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Scheduled Date & Time (Conditional) */}
                  {timerMode === 'SCHEDULED' && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2 animate-in fade-in">
                      <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Scheduled Start Date & Time *
                      </label>
                      <input 
                        type="datetime-local" 
                        value={scheduledStartTime} 
                        onChange={(e) => setScheduledStartTime(e.target.value)}
                        required={timerMode === 'SCHEDULED'}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500"
                      />
                      <p className="text-[11px] text-slate-400">All enrolled students will see a synchronized countdown to this specific time.</p>
                    </div>
                  )}

                  {/* Duration & Marks */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Duration (Minutes) *
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        max="600"
                        value={durationMinutes} 
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        required
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Total Marks
                      </label>
                      <input 
                        type="number" 
                        value={totalMarks} 
                        onChange={(e) => setTotalMarks(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Pass Marks
                      </label>
                      <input 
                        type="number" 
                        value={passMarks} 
                        onChange={(e) => setPassMarks(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Exam Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Exam Instructions for Students
                    </label>
                    <textarea 
                      rows={4}
                      value={instructions} 
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Read each question carefully. Do not refresh the page while exam is running. Submit before time runs out."
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 resize-y"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-brand-accent hover:bg-brand-accent/90 text-white font-extrabold px-8 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Save Settings
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: SUBMISSIONS & RESULTS */}
              {activeTab === 'submissions' && (
                <div className="space-y-6 max-w-6xl mx-auto">
                  <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Users className="text-blue-400" size={18} /> Student Exam Submissions ({submissions.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                        View student attempts, scores, answer files, and grade structured papers.
                      </p>
                    </div>
                    <button
                      onClick={fetchSubmissions}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="text-center py-16 bg-white/[0.01] rounded-2xl border border-white/5">
                      <AlertCircle className="mx-auto text-slate-500 mb-3" size={36} />
                      <p className="text-slate-400 text-sm font-semibold">No students have submitted this paper yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="p-3.5">Student</th>
                            <th className="p-3.5">Phone / City</th>
                            <th className="p-3.5">Started At</th>
                            <th className="p-3.5">Submitted At</th>
                            <th className="p-3.5">Score / Result</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          {submissions.map((sub) => {
                            const isPassed = (sub.score || 0) >= (passMarks || 40);
                            return (
                              <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center font-black text-xs">
                                    {sub.student?.firstName?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                    <p className="leading-tight">{sub.student?.firstName} {sub.student?.lastName}</p>
                                    <span className="text-[10px] text-slate-500">ID #{sub.student?.id}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-slate-400">
                                  {sub.student?.phone} <br />
                                  <span className="text-[10px] text-slate-500">{sub.student?.city || 'No City'}</span>
                                </td>
                                <td className="p-3.5 text-slate-400">
                                  {sub.startedAt ? new Date(sub.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                                <td className="p-3.5 text-slate-400">
                                  {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}
                                </td>
                                <td className="p-3.5">
                                  {paperType === 'MCQ' ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`font-black text-sm ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
                                        {sub.score}%
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        ({sub.correctAnswers || 0}/{sub.totalQuestions || 0})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-purple-300">
                                      {sub.score !== null ? `${sub.score} Marks` : 'Ungraded'}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${sub.status === 'SUBMITTED' || sub.status === 'GRADED' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                    {sub.status}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  {paperType === 'STRUCTURED' && (
                                    <div className="flex justify-end gap-2">
                                      {sub.answerFile && (
                                        <a
                                          href={`${getBaseUrl()}/storage/documents/${sub.answerFile}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                                        >
                                          <Download size={12} /> Answer Sheet
                                        </a>
                                      )}
                                      <button
                                        onClick={() => {
                                          setGradingSubmission(sub);
                                          setGradeScore(sub.score !== null ? String(sub.score) : '');
                                          setGradeFeedback(sub.teacherFeedback || '');
                                        }}
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"
                                      >
                                        Grade
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Grading Modal */}
                  {gradingSubmission && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4">
                      <div className="bg-[#0e1626] border border-white/20 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                          <h4 className="font-bold text-white text-base">
                            Grade Submission: {gradingSubmission.student?.firstName}
                          </h4>
                          <button onClick={() => setGradingSubmission(null)} className="text-gray-400 hover:text-white">
                            <X size={18} />
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Score / Marks (out of {totalMarks})
                          </label>
                          <input
                            type="number"
                            value={gradeScore}
                            onChange={(e) => setGradeScore(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500"
                            placeholder="e.g. 75"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Teacher Feedback
                          </label>
                          <textarea
                            rows={3}
                            value={gradeFeedback}
                            onChange={(e) => setGradeFeedback(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500 resize-y"
                            placeholder="Add helpful remarks for the student..."
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => setGradingSubmission(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleGradeSubmit}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold"
                          >
                            Submit Grade
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
