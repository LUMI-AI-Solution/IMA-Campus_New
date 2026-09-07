import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Clock, Calendar, CheckCircle2, 
  HelpCircle, ChevronLeft, ChevronRight, Send, RefreshCw, Award, 
  FileText, FileSignature, UploadCloud, Download, Check, 
  ArrowLeft, Grid, Play, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function StudentPaperPortal({ content, isOpen, onClose, onCompleted }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paperData, setPaperData] = useState(null);
  const [submission, setSubmission] = useState(null);

  // Exam state
  const [examStatus, setExamStatus] = useState('PRE_START'); // 'PRE_START' | 'COUNTDOWN_TO_START' | 'IN_PROGRESS' | 'SUBMITTED'
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: selectedOptionId }
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(null);
  const [timeUntilStartSeconds, setTimeUntilStartSeconds] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // Structured paper upload state
  const [answerFile, setAnswerFile] = useState(null);

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen && content?.id) {
      loadPaper();
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, content?.id]);

  const loadPaper = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/papers/content/${content.id}`);
      const data = res.data;
      setPaperData(data);
      
      const p = data.paper;
      const sub = data.userSubmission;
      const serverNow = new Date(data.serverTime || Date.now());

      if (sub) {
        setSubmission(sub);
        if (sub.status === 'SUBMITTED' || sub.status === 'GRADED') {
          setExamStatus('SUBMITTED');
          if (Array.isArray(sub.answers)) {
            const ansMap = {};
            sub.answers.forEach(a => {
              ansMap[a.questionId] = a.selectedOptionId;
            });
            setSelectedAnswers(ansMap);
          }
          setLoading(false);
          return;
        }
      }

      // Check timer mode
      if (p.timerMode === 'SCHEDULED' && p.scheduledStartTime) {
        const startTime = new Date(p.scheduledStartTime);
        const diffToStart = Math.floor((startTime.getTime() - serverNow.getTime()) / 1000);
        
        if (diffToStart > 0) {
          setTimeUntilStartSeconds(diffToStart);
          setExamStatus('COUNTDOWN_TO_START');
        } else {
          const examEndTime = new Date(startTime.getTime() + p.durationMinutes * 60 * 1000);
          const diffToEnd = Math.floor((examEndTime.getTime() - serverNow.getTime()) / 1000);
          
          if (diffToEnd > 0) {
            setTimeRemainingSeconds(diffToEnd);
            setExamStatus('IN_PROGRESS');
          } else {
            setTimeRemainingSeconds(0);
            setExamStatus('SUBMITTED');
          }
        }
      } else {
        // Flexible Mode
        if (sub && sub.status === 'IN_PROGRESS' && sub.startedAt) {
          const startedAt = new Date(sub.startedAt);
          const examEndTime = new Date(startedAt.getTime() + p.durationMinutes * 60 * 1000);
          const diffToEnd = Math.floor((examEndTime.getTime() - serverNow.getTime()) / 1000);
          
          if (diffToEnd > 0) {
            setTimeRemainingSeconds(diffToEnd);
            setExamStatus('IN_PROGRESS');
          } else {
            setTimeRemainingSeconds(0);
            setExamStatus('SUBMITTED');
          }
        } else {
          setExamStatus('PRE_START');
        }
      }

    } catch (err) {
      console.error("Failed to load student paper", err);
      toast.error("Failed to load exam details");
    } finally {
      setLoading(false);
    }
  };

  // Live Timer Interval
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (examStatus === 'COUNTDOWN_TO_START' && timeUntilStartSeconds !== null) {
      timerIntervalRef.current = setInterval(() => {
        setTimeUntilStartSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            const durationSecs = (paperData?.paper?.durationMinutes || 60) * 60;
            setTimeRemainingSeconds(durationSecs);
            setExamStatus('IN_PROGRESS');
            toast.success("Exam has officially started.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (examStatus === 'IN_PROGRESS' && timeRemainingSeconds !== null) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [examStatus, timeUntilStartSeconds, timeRemainingSeconds, paperData]);

  // Start Exam (Flexible mode)
  const handleStartExam = async () => {
    if (!paperData?.paper?.id) return;
    try {
      setLoading(true);
      const res = await api.post(`/papers/${paperData.paper.id}/start`);
      setSubmission(res.data.submission);
      const durationSecs = (paperData.paper.durationMinutes || 60) * 60;
      setTimeRemainingSeconds(durationSecs);
      setExamStatus('IN_PROGRESS');
      toast.success("Exam started. Time is counting down.");
    } catch (err) {
      console.error("Failed to start paper", err);
      toast.error("Failed to start exam");
    } finally {
      setLoading(false);
    }
  };

  // Answer Select for MCQ
  const handleSelectOption = (questionId, optionId) => {
    if (examStatus !== 'IN_PROGRESS') return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Submit Paper
  const handleSubmitExam = async () => {
    if (!paperData?.paper?.id) return;
    setSubmitting(true);
    setShowConfirmSubmit(false);
    try {
      const isMCQ = paperData.paper.paperType === 'MCQ';
      
      if (isMCQ) {
        const answersArray = Object.keys(selectedAnswers).map(qId => ({
          questionId: parseInt(qId),
          selectedOptionId: selectedAnswers[qId]
        }));

        const res = await api.post(`/papers/${paperData.paper.id}/submit`, {
          answers: answersArray
        });

        toast.success(`Exam submitted successfully. Score: ${res.data.score}%`);
        setSubmission(res.data.submission);
        setExamStatus('SUBMITTED');
        loadPaper();
        if (onCompleted) onCompleted();
      } else {
        if (!answerFile && !submission?.answerFile) {
          toast.error("Please select your answer sheet file before submitting.");
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        if (answerFile) {
          formData.append('answerFile', answerFile);
        }

        const res = await api.post(`/papers/${paperData.paper.id}/submit`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        toast.success("Structured paper submitted successfully.");
        setSubmission(res.data.submission);
        setExamStatus('SUBMITTED');
        if (onCompleted) onCompleted();
      }
    } catch (err) {
      console.error("Failed to submit exam", err);
      toast.error("Failed to submit exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmitOnTimeout = () => {
    toast.error("Exam duration completed. Submitting answers...", { duration: 4000 });
    handleSubmitExam();
  };

  const formatSeconds = (totalSecs) => {
    if (totalSecs === null || totalSecs === undefined || totalSecs < 0) return '00:00:00';
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCountdownDays = (totalSecs) => {
    if (!totalSecs || totalSecs < 0) return '00h 00m 00s';
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (!isOpen) return null;

  const questions = paperData?.paper?.questions || [];
  const currentQ = questions[currentQuestionIdx];
  const isMCQ = paperData?.paper?.paperType === 'MCQ';

  const answeredCount = Object.keys(selectedAnswers).filter(k => selectedAnswers[k] !== null && selectedAnswers[k] !== undefined).length;
  const unansweredCount = questions.length - answeredCount;

  const getBaseUrl = () => {
    let baseApiUrl = (api.defaults && api.defaults.baseURL) 
      ? api.defaults.baseURL.replace('/api', '') 
      : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
    return baseApiUrl || 'http://localhost:5000';
  };

  const portalContent = (
    <div className="fixed inset-0 z-[99999999] w-screen h-[100dvh] bg-[#080d19]/95 backdrop-blur-3xl text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* 🌟 HEADER BAR 🌟 */}
      <header className="h-14 sm:h-16 px-4 sm:px-8 bg-white/[0.02] border-b border-white/10 flex items-center justify-between shrink-0 z-50">
        
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 outline-none shrink-0"
            title="Exit Exam Portal"
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 truncate">
                {isMCQ ? 'MCQ Examination' : 'Structured Paper'}
              </span>
            </div>
            <h2 className="text-xs sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-md md:max-w-xl">
              {content?.title}
            </h2>
          </div>
        </div>

        {/* Right: Timer & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Modern Clean Countdown Timer Pill */}
          {examStatus === 'IN_PROGRESS' && (
            <div className={`flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-full border transition-all shadow-md ${
              timeRemainingSeconds !== null && timeRemainingSeconds < 300 
                ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-red-500/20 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10'
            }`}>
              <Clock size={15} className={timeRemainingSeconds !== null && timeRemainingSeconds < 300 ? 'text-red-400' : 'text-emerald-400'} />
              <span className="font-sans font-black text-xs sm:text-sm tracking-wider">
                {formatSeconds(timeRemainingSeconds)}
              </span>
            </div>
          )}

          {/* Mobile Question Palette Button */}
          {examStatus === 'IN_PROGRESS' && isMCQ && (
            <button
              onClick={() => setShowMobilePalette(true)}
              className="lg:hidden bg-white/5 hover:bg-white/10 text-white font-bold p-2 sm:p-2.5 rounded-xl border border-white/10 flex items-center gap-1.5 text-xs transition-all active:scale-95"
              title="Question Palette"
            >
              <Grid size={15} className="text-rose-400" />
              <span className="text-[11px] font-bold">{answeredCount}/{questions.length}</span>
            </button>
          )}

          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 p-2 sm:p-2.5 rounded-xl transition-all outline-none"
            title="Close"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </header>

      {/* 🌟 BODY CONTAINER 🌟 */}
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center m-auto p-8 gap-4">
            <RefreshCw className="animate-spin text-rose-500" size={36} />
            <p className="text-slate-400 font-semibold text-sm">Preparing exam environment...</p>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col">
            
            {/* 🌟 STATE 1: PRE-START (Flexible Start - Compact No-Scroll Landscape View) 🌟 */}
            {examStatus === 'PRE_START' && (
              <div className="w-full max-w-xl mx-auto my-auto p-4 sm:p-6 flex flex-col items-center text-center space-y-4 sm:space-y-5 animate-in fade-in">
                
                {/* Landscape Thumbnail Banner */}
                {content.thumbnail ? (
                  <div className="w-full max-w-sm sm:max-w-md aspect-[16/9] max-h-48 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-white/[0.02] shrink-0">
                    <img src={`${getBaseUrl()}/storage/documents/${content.thumbnail}`} alt="Exam" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full max-w-sm sm:max-w-md aspect-[16/9] max-h-36 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center shrink-0">
                    <Award size={40} className="text-amber-400/80" />
                  </div>
                )}

                {/* Title & Instructions */}
                <div className="space-y-1.5 max-w-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-block">
                    Ready to Start
                  </span>
                  <h1 className="text-base sm:text-2xl font-black text-white leading-snug">
                    {content.title}
                  </h1>
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                    {paperData?.paper?.instructions || "Ensure you have a stable internet connection. When you click 'Start Exam Now', your countdown timer will begin immediately."}
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5 w-full max-w-md">
                  <div className="bg-white/[0.03] border border-white/10 p-2.5 sm:p-3 rounded-xl">
                    <Clock className="text-blue-400 mx-auto mb-1" size={18} />
                    <p className="text-[9px] uppercase font-bold text-slate-400">Duration</p>
                    <p className="text-xs sm:text-sm font-bold text-white">{paperData?.paper?.durationMinutes || 60} Mins</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 p-2.5 sm:p-3 rounded-xl">
                    <HelpCircle className="text-emerald-400 mx-auto mb-1" size={18} />
                    <p className="text-[9px] uppercase font-bold text-slate-400">{isMCQ ? 'Questions' : 'Format'}</p>
                    <p className="text-xs sm:text-sm font-bold text-white">{isMCQ ? `${questions.length} MCQs` : 'PDF Upload'}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 p-2.5 sm:p-3 rounded-xl">
                    <Award className="text-amber-400 mx-auto mb-1" size={18} />
                    <p className="text-[9px] uppercase font-bold text-slate-400">Pass Mark</p>
                    <p className="text-xs sm:text-sm font-bold text-white">{paperData?.paper?.passMarks || 40}%</p>
                  </div>
                </div>

                {/* Start Exam CTA Button */}
                <div className="w-full max-w-md pt-1">
                  <button
                    onClick={handleStartExam}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play size={16} fill="currentColor" /> Start Exam Now
                  </button>
                </div>
              </div>
            )}

            {/* 🌟 STATE 2: COUNTDOWN TO START (Scheduled Start) 🌟 */}
            {examStatus === 'COUNTDOWN_TO_START' && (
              <div className="w-full max-w-lg mx-auto my-auto p-4 sm:p-6 flex flex-col items-center text-center space-y-4 sm:space-y-6 animate-in fade-in">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                  <Calendar size={28} />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block">
                    Synchronized Scheduled Exam
                  </span>
                  <h1 className="text-base sm:text-2xl font-black text-white">{content.title}</h1>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    This paper is scheduled to start simultaneously for all registered students.
                  </p>
                </div>

                {/* Big Countdown Box */}
                <div className="w-full max-w-sm bg-white/[0.03] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
                  <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider mb-2">Exam Starts In</p>
                  <div className="font-sans font-black text-2xl sm:text-4xl text-white tracking-wider">
                    {formatCountdownDays(timeUntilStartSeconds)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">
                    Questions unlock automatically when countdown reaches zero.
                  </p>
                </div>
              </div>
            )}

            {/* 🌟 STATE 3: IN PROGRESS (MCQ EXAM FULL-SCREEN) 🌟 */}
            {examStatus === 'IN_PROGRESS' && isMCQ && (
              <div className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* Main Question Area (Col 1-3) */}
                <div className="lg:col-span-3 space-y-4">
                  
                  {currentQ ? (
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 space-y-5 sm:space-y-6 shadow-xl relative backdrop-blur-md h-auto">
                      
                      {/* Question Top Meta */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                          Question {currentQuestionIdx + 1} of {questions.length}
                        </span>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-400">
                          {selectedAnswers[currentQ.id] !== undefined ? 'Answered' : 'Not Answered'}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-3">
                        <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white leading-relaxed whitespace-pre-line">
                          {currentQ.questionText}
                        </h3>

                        {currentQ.image && (
                          <div className="rounded-2xl overflow-hidden border border-white/10 max-h-64 sm:max-h-80 bg-white/[0.02] p-2 flex items-center justify-center">
                            <img 
                              src={`${getBaseUrl()}/storage/documents/${currentQ.image}`} 
                              alt="Question Figure" 
                              className="max-h-60 sm:max-h-72 object-contain rounded-xl" 
                            />
                          </div>
                        )}
                      </div>

                      {/* Options List */}
                      <div className="space-y-2.5 sm:space-y-3 pt-1">
                        {(currentQ.options || []).map((opt, optIdx) => {
                          const isSelected = selectedAnswers[currentQ.id] === opt.id;
                          return (
                            <button
                              key={opt.id || optIdx}
                              onClick={() => handleSelectOption(currentQ.id, opt.id)}
                              className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex items-center gap-3 sm:gap-4 group ${
                                isSelected 
                                  ? 'bg-rose-600/20 border-rose-500 shadow-lg shadow-rose-600/20 scale-[1.008]' 
                                  : 'bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05]'
                              }`}
                            >
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-sans font-bold text-xs sm:text-sm transition-all shrink-0 ${
                                isSelected 
                                  ? 'bg-rose-600 text-white shadow-md' 
                                  : 'bg-white/10 text-slate-400 border border-white/10 group-hover:border-white/30'
                              }`}>
                                {isSelected ? <Check size={16} /> : (optIdx + 1)}
                              </div>
                              <span className={`text-xs sm:text-base font-semibold leading-relaxed flex-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {opt.optionText}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Navigation Buttons */}
                      <div className="flex justify-between items-center pt-4 sm:pt-6 border-t border-white/10 gap-2">
                        <button
                          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestionIdx === 0}
                          className="bg-white/5 hover:bg-white/10 text-white font-bold px-3.5 sm:px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 active:scale-95 border border-white/5"
                        >
                          <ChevronLeft size={16} /> <span className="hidden xs:inline">Previous</span>
                        </button>

                        <div className="flex gap-2.5">
                          {currentQuestionIdx < questions.length - 1 ? (
                            <button
                              onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 sm:px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-white/10"
                            >
                              Next <ChevronRight size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowConfirmSubmit(true)}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-5 sm:px-7 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 border border-emerald-400/30"
                            >
                              <Send size={14} /> Submit Exam
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <p className="text-white text-center py-12">No questions found in this paper.</p>
                  )}
                </div>

                {/* Right Desktop Palette (Col 4) */}
                <div className="hidden lg:block lg:col-span-1 space-y-4">
                  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-md sticky top-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                      <span>Question Palette</span>
                      <span className="text-emerald-400 font-sans font-bold">{answeredCount}/{questions.length}</span>
                    </h4>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="bg-gradient-to-r from-rose-500 to-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%` }}
                      />
                    </div>

                    {/* Grid Palette */}
                    <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto custom-scrollbar p-1">
                      {questions.map((q, idx) => {
                        const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null;
                        const isCurrent = currentQuestionIdx === idx;
                        return (
                          <button
                            key={q.id || idx}
                            onClick={() => setCurrentQuestionIdx(idx)}
                            className={`h-9 rounded-xl font-sans font-bold text-xs transition-all flex items-center justify-center border ${
                              isCurrent 
                                ? 'border-rose-500 ring-2 ring-rose-500/50 text-white scale-105 z-10 bg-rose-500/20' 
                                : isAnswered 
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' 
                                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit CTA */}
                    <button
                      onClick={() => setShowConfirmSubmit(true)}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
                    >
                      Submit Exam
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 🌟 STATE 3: IN PROGRESS (STRUCTURED PAPER FULL-SCREEN) 🌟 */}
            {examStatus === 'IN_PROGRESS' && !isMCQ && (
              <div className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-8 flex flex-col justify-center space-y-5 animate-in fade-in">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl backdrop-blur-md">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <FileSignature size={20} className="text-purple-400" /> Structured Paper Instructions
                  </h3>
                  
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl text-xs text-slate-300 space-y-1.5 leading-relaxed">
                    <p>1. Download the question paper PDF below.</p>
                    <p>2. Write your answers clearly on A4 or ruled paper.</p>
                    <p>3. Scan or take photos of your answer sheets, combine into a single PDF, and upload below before the timer expires.</p>
                  </div>

                  {/* Download Master PDF */}
                  {content.fileName && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        <FileText size={24} className="text-purple-400 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white">Question Sheet PDF</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">{content.fileName}</p>
                        </div>
                      </div>
                      <a 
                        href={`${getBaseUrl()}/storage/documents/${content.fileName}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        download
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                      >
                        <Download size={14} /> Download PDF
                      </a>
                    </div>
                  )}

                  {/* Upload Answer Sheet */}
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Upload Answer Sheet (PDF or Images)
                    </label>

                    <div className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-2xl p-6 text-center bg-white/[0.02] transition-colors relative cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => setAnswerFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud size={32} className="mx-auto text-purple-400 mb-2" />
                      {answerFile ? (
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-emerald-400">{answerFile.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{(answerFile.size / 1024 / 1024).toFixed(2)} MB • Ready to submit</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white">Click or tap to upload answer PDF</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Supports PDF, PNG, JPG (Max 25MB)</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSubmitExam}
                      disabled={submitting || !answerFile}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {submitting ? <RefreshCw className="animate-spin" size={16} /> : <><Send size={15} /> Submit Answer Sheet</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 STATE 4: SUBMITTED (SCORECARD & QUESTION REVIEW) 🌟 */}
            {examStatus === 'SUBMITTED' && (
              <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6 animate-in fade-in">
                
                {/* Score Banner (MCQ) */}
                {isMCQ ? (
                  <div className="bg-white/[0.03] border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg font-bold border-2 border-white/20">
                      <Award size={36} className="sm:w-10 sm:h-10" />
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full inline-block ${
                        (submission?.score || 0) >= (paperData?.paper?.passMarks || 40)
                          ? 'bg-green-500/20 text-green-300 border border-green-500/40' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        {(submission?.score || 0) >= (paperData?.paper?.passMarks || 40) ? 'Exam Passed' : 'Exam Failed'}
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-black text-white">{submission?.score || 0}%</h2>
                      <p className="text-slate-400 text-xs sm:text-sm">
                        You scored {submission?.correctAnswers || 0} out of {submission?.totalQuestions || questions.length} questions correctly.
                      </p>
                    </div>

                    {/* Stats Summary Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm mx-auto pt-1">
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Total</p>
                        <p className="text-xs sm:text-sm font-bold text-white">{submission?.totalQuestions || questions.length}</p>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 p-2.5 rounded-xl">
                        <p className="text-[9px] uppercase font-bold text-green-400">Correct</p>
                        <p className="text-xs sm:text-sm font-bold text-green-300">{submission?.correctAnswers || 0}</p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
                        <p className="text-[9px] uppercase font-bold text-red-400">Incorrect</p>
                        <p className="text-xs sm:text-sm font-bold text-red-300">{(submission?.totalQuestions || questions.length) - (submission?.correctAnswers || 0)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Structured Submission Receipt */
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xl">
                    <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
                    <h2 className="text-base sm:text-xl font-bold text-white">Structured Paper Submitted</h2>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto">
                      Your answer sheet has been securely submitted for lecturer evaluation.
                    </p>
                    {submission?.score !== null && submission?.score !== undefined ? (
                      <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl max-w-xs mx-auto mt-3">
                        <p className="text-[10px] uppercase font-bold text-purple-300">Awarded Marks</p>
                        <p className="text-2xl font-black text-white">{submission.score} Marks</p>
                        {submission.teacherFeedback && (
                          <p className="text-xs text-slate-300 mt-1 italic">"{submission.teacherFeedback}"</p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold mt-2">
                        Pending Lecturer Evaluation
                      </span>
                    )}
                  </div>
                )}

                {/* MCQ Detailed Question Review */}
                {isMCQ && questions.length > 0 && (
                  <div className="space-y-3 sm:space-y-4 pt-1">
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="text-indigo-400" size={16} /> Detailed Question Review
                    </h3>

                    <div className="space-y-2.5 sm:space-y-3">
                      {questions.map((q, idx) => {
                        const studentSelectedOptId = selectedAnswers[q.id];
                        const correctOpt = q.options.find(o => o.isCorrect);
                        const isStudentCorrect = studentSelectedOptId && correctOpt && studentSelectedOptId === correctOpt.id;

                        return (
                          <div 
                            key={q.id || idx} 
                            className={`border rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-2.5 ${
                              isStudentCorrect 
                                ? 'bg-green-500/[0.03] border-green-500/30' 
                                : 'bg-red-500/[0.03] border-red-500/30'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                isStudentCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                              }`}>
                                Question #{idx + 1} • {isStudentCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-white">{q.questionText}</p>

                            {/* Options */}
                            <div className="space-y-1.5 pt-1">
                              {q.options.map((opt, optIdx) => {
                                const wasChosen = studentSelectedOptId === opt.id;
                                const isCorrectAns = opt.isCorrect;

                                let optStyle = 'bg-white/[0.02] border-white/5 text-slate-400';
                                if (isCorrectAns) {
                                  optStyle = 'bg-green-500/20 border-green-500/60 text-green-200 font-bold';
                                } else if (wasChosen && !isCorrectAns) {
                                  optStyle = 'bg-red-500/20 border-red-500/60 text-red-200 font-bold';
                                }

                                return (
                                  <div 
                                    key={opt.id || optIdx}
                                    className={`p-2 sm:p-2.5 rounded-lg border text-[11px] sm:text-xs flex items-center justify-between ${optStyle}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded bg-white/10 flex items-center justify-center font-sans font-bold text-[10px] shrink-0">
                                        {optIdx + 1}
                                      </span>
                                      <span>{opt.optionText}</span>
                                    </div>

                                    <div className="flex items-center gap-1 font-bold uppercase text-[8px] sm:text-[9px] shrink-0">
                                      {wasChosen && (
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded">Your Answer</span>
                                      )}
                                      {isCorrectAns && (
                                        <span className="bg-green-500 text-black px-1.5 py-0.5 rounded font-bold">Correct Answer</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </main>

      {/* 📱 MOBILE QUESTION PALETTE DRAWER 📱 */}
      {showMobilePalette && isMCQ && (
        <div className="fixed inset-0 z-[10000000] bg-black/80 backdrop-blur-md flex flex-col justify-end lg:hidden animate-in fade-in">
          <div className="bg-[#0b1324] border-t border-white/20 rounded-t-3xl p-5 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Question Palette ({answeredCount}/{questions.length})
              </h4>
              <button onClick={() => setShowMobilePalette(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2 overflow-y-auto custom-scrollbar p-1">
              {questions.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null;
                const isCurrent = currentQuestionIdx === idx;
                return (
                  <button
                    key={q.id || idx}
                    onClick={() => {
                      setCurrentQuestionIdx(idx);
                      setShowMobilePalette(false);
                    }}
                    className={`h-10 rounded-xl font-sans font-bold text-xs transition-all flex items-center justify-center border ${
                      isCurrent 
                        ? 'border-rose-500 ring-2 ring-rose-500/50 text-white scale-105 bg-rose-500/20' 
                        : isAnswered 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-white/5 text-slate-400 border-white/10'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowMobilePalette(false);
                setShowConfirmSubmit(true);
              }}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-md"
            >
              Submit Exam
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[10000001] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b1324] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl backdrop-blur-2xl">
            
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <AlertCircle size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-white">Are you sure you want to submit?</h3>
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-xl inline-block">
                No changes can be made after submission
              </p>
              <p className="text-slate-300 text-xs leading-relaxed pt-1">
                You have answered <span className="text-emerald-400 font-black">{answeredCount}</span> of <span className="text-white font-black">{questions.length}</span> questions.
                {unansweredCount > 0 && (
                  <span className="block text-rose-400 font-bold mt-1.5">
                    You still have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}!
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all active:scale-95 border border-white/10"
              >
                Cancel & Review
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95 border border-emerald-400/30 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="animate-spin" size={16} /> : <><Send size={15} /> Yes, Submit Now</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return createPortal(portalContent, document.body);
}
