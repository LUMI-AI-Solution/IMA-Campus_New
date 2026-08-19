import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../api/axios';
import { Loader2, BookOpen, Layers, ArrowLeft, ChevronRight, GraduationCap, Component, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CourseView from './CourseView';

export default function MyClassroom() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectionLevel, setSelectionLevel] = useState(0);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [selectedStream, setSelectedStream] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const [openedCourseId, setOpenedCourseId] = useState(null);
    const [activeStream, setActiveStream] = useState('All');

    const backendBaseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online';

    useEffect(() => {
        axios.get('/student/classroom')
            .then(res => setBusinesses(res.data?.businesses || []))
            .catch(() => toast.error("Failed to load data."))
            .finally(() => setLoading(false));
    }, []);

    const getImageUrl = (imageName) => imageName && imageName !== 'null' && imageName !== 'default.png'
        ? `${backendBaseUrl}/storage/icons/${imageName}`
        : '/logo.png';

    const handleBusinessSelect = (biz) => {
        setSelectedBusiness(biz);

        const streams = getEnrolledStreams(biz);

        if (biz.batches && biz.batches.length === 1) {
            setSelectedBatch(biz.batches[0]);

            if (streams.length === 1) {
                setSelectedStream(streams[0]);
                setSelectionLevel(3);
            } else {
                setSelectionLevel(1);
            }
        } else if (biz.batches && biz.batches.length > 1) {
            if (streams.length === 1) {
                setSelectedStream(streams[0]);
                setSelectionLevel(2); // Skip stream selection
            } else {
                setSelectionLevel(1);
            }
        } else {
            toast.error("No batches found for this business.");
        }
    };

    const getEnrolledStreams = (business) => {
        if (!business) return [];
        const streams = new Set();
        let hasCommon = false;
        business.batches?.forEach(b => {
            b.groups?.forEach(g => {
                g.courses?.forEach(c => {
                    if (c.stream) streams.add(c.stream);
                    else hasCommon = true;
                });
            });
        });
        const arr = Array.from(streams);
        if (hasCommon) arr.push("Common Subjects");
        return arr;
    };

    const getFilteredBatches = () => {
        if (!selectedBusiness || !selectedStream) return [];
        return selectedBusiness.batches.filter(b => {
            return b.groups.some(g =>
                g.courses.some(c =>
                    (c.stream === selectedStream) || (!c.stream && selectedStream === "Common Subjects")
                )
            );
        });
    };

    const handleBack = () => {
        if (openedCourseId) {
            setOpenedCourseId(null);
            return;
        }
        if (selectionLevel > 0) {
            if (selectionLevel === 1) {
                setSelectionLevel(0);
                setSelectedBusiness(null);
            } else if (selectionLevel === 2) {
                const streams = getEnrolledStreams(selectedBusiness);
                if (streams.length === 1) {
                    setSelectionLevel(0);
                    setSelectedBusiness(null);
                    setSelectedStream(null);
                } else {
                    setSelectionLevel(1);
                    setSelectedStream(null);
                }
                setSelectedBatch(null);
                setActiveStream('All');
            } else if (selectionLevel === 3) {
                if (selectedBusiness?.batches?.length === 1) {
                    const streams = getEnrolledStreams(selectedBusiness);
                    if (streams.length === 1) {
                        setSelectionLevel(0);
                        setSelectedBusiness(null);
                        setSelectedBatch(null);
                        setSelectedStream(null);
                    } else {
                        setSelectionLevel(1);
                        setSelectedBatch(null);
                        setSelectedStream(null);
                        setActiveStream('All');
                    }
                } else {
                    setSelectionLevel(2);
                    setSelectedBatch(null);
                    setActiveStream('All');
                }
            }
        }
    };

    const renderGroupedCourses = () => {
        if (!selectedBatch || !selectedBatch.groups) {
            return (
                <div className="text-center py-12 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-inner">
                    <p className="text-white/70 font-bold text-lg">No subjects found for this batch.</p>
                </div>
            );
        }

        // 🔥 FIX: Find subjects that are in Full Payment/Installment groups
        const fullPaymentSubjectIds = new Set();
        selectedBatch.groups.forEach(group => {
            // Check if group is NOT Monthly (type 1)
            if (group.type !== 1) {
                group.courses?.forEach(c => fullPaymentSubjectIds.add(c.id));
            }
        });

        let hasAnyCourse = false;

        const content = selectedBatch.groups.flatMap((group, gIdx) => {
            let coursesForGroup = group.courses || [];

            // 🔥 FIX: If it's a Monthly Group, remove subjects that exist in Full Payment groups
            if (group.type === 1) {
                coursesForGroup = coursesForGroup.filter(c => !fullPaymentSubjectIds.has(c.id));
            }

            // Filter by selected stream
            if (activeStream !== 'All') {
                coursesForGroup = coursesForGroup.filter(c => (c.stream === activeStream) || (!c.stream && activeStream === "Common Subjects"));
            }

            if (coursesForGroup.length === 0) return [];
            hasAnyCourse = true;

            // Group courses by their individual payment type
            const coursesByPaymentType = {
                1: coursesForGroup.filter(c => c.studentPaymentType === 1 || c.studentPaymentType === undefined),
                2: coursesForGroup.filter(c => c.studentPaymentType === 2),
                3: coursesForGroup.filter(c => c.studentPaymentType === 3)
            };

            const groupBlocks = [];

            Object.entries(coursesByPaymentType).forEach(([type, courses]) => {
                if (courses.length === 0) return;

                const isMonthly = parseInt(type) === 1;
                const isInstallment = parseInt(type) === 2;
                const groupTitle = isMonthly 
                    ? group.name.toLowerCase().includes("monthly payment") ? group.name : `Monthly Payment - ${group.name}`
                    : isInstallment 
                        ? `Installment Payment` 
                        : `Full Payment`;
                const badgeColorClass = isMonthly 
                    ? "text-orange-400 bg-orange-500/10 border-orange-500/20" 
                    : isInstallment 
                        ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                groupBlocks.push(
                    <div key={`${gIdx}-${type}`} className="mb-10 last:mb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                            <div className="flex items-center gap-3">
                                <BookOpen className="text-blue-400" size={18} />
                                <h4 className="text-lg font-bold text-white tracking-wide">Your Subjects</h4>
                            </div>
                            <div className={`px-4 py-1.5 rounded-lg border ${badgeColorClass} text-[10px] sm:text-xs font-bold uppercase tracking-widest inline-block max-w-full truncate`} title={groupTitle}>
                                {groupTitle}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map((course) => (
                                <div key={course.id} onClick={() => setOpenedCourseId(course.id)} className="bg-black/40 backdrop-blur-xl border border-white/10 hover:border-red-500 hover:bg-black/60 p-5 md:p-6 rounded-[2.5rem] cursor-pointer transition-all duration-500 flex flex-row justify-between items-center gap-4 group shadow-md hover:shadow-2xl hover:-translate-y-1">
                                    <div className="text-left flex flex-col gap-2 min-w-0 flex-1">
                                        <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-red-400 transition-colors truncate drop-shadow-md">{course.name}</h3>
                                        {course.code && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 uppercase w-max tracking-widest shadow-sm">{course.code}</span>}
                                    </div>
                                    <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg group-hover:bg-red-500 flex items-center justify-center text-white/90 group-hover:text-white shrink-0 border border-white/20 group-hover:border-transparent transition-all duration-500 shadow-md group-hover:shadow-red-500/50 group-hover:scale-110">
                                        <PlayCircle size={26} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            });

            return groupBlocks;
        });

        if (!hasAnyCourse) {
            return (
                <div className="text-center py-12 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-inner">
                    <p className="text-white/70 font-bold text-lg">No subjects found for this stream in the selected batch.</p>
                </div>
            );
        }

        return content;
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={40} /></div>;

    if (openedCourseId) {
        return <CourseView courseId={openedCourseId} onBack={handleBack} />;
    }

    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/20">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center shrink-0">
                    <GraduationCap size={30} className="text-red-500" />
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-wider uppercase">My Classroom</h2>
                    <p className="text-white/90 font-bold mt-1 text-xs md:text-sm font-medium">Access your enrolled subjects and materials.</p>
                </div>
            </div>

            {selectionLevel > 0 && (
                <div className="mb-8 flex flex-col md:flex-row md:items-center gap-4">
                    <button onClick={handleBack} className="text-white/80 font-bold hover:text-white bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl hover:from-white/20 hover:to-white/10 border border-white/10 px-6 py-3 rounded-2xl flex items-center w-max transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-x-1">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </button>
                    <div className="flex items-center flex-wrap gap-2 text-[10px] md:text-xs font-extrabold text-white/80 uppercase tracking-widest bg-black/20 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl w-full md:w-max shadow-inner">
                        <span className={selectionLevel >= 1 ? "text-red-500" : ""}>{selectedBusiness?.name}</span>
                        {selectionLevel >= 2 && <><ChevronRight size={14} className="shrink-0 opacity-50" /> <span className="text-red-500 truncate max-w-[150px] sm:max-w-none">{selectedStream}</span></>}
                        {selectionLevel >= 3 && <><ChevronRight size={14} className="shrink-0 opacity-50" /> <span className="text-red-500 truncate max-w-[150px] sm:max-w-none">{selectedBatch?.name}</span></>}
                    </div>
                </div>
            )}

            {selectionLevel === 0 && (
                <div className="bg-white/10 backdrop-blur-3xl border border-white/30 shadow-2xl rounded-[3rem] p-6 md:p-12">
                    <h3 className="text-xl md:text-2xl font-extrabold text-white mb-8 flex items-center gap-3"><BookOpen className="text-red-500" /> Select Course</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {businesses.map(biz => (
                            <div key={biz.id} onClick={() => handleBusinessSelect(biz)} className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-white/10 hover:border-red-400 p-8 rounded-[2.5rem] flex flex-col items-center cursor-pointer transition-all duration-500 group shadow-lg hover:shadow-2xl hover:-translate-y-2">
                                <img src={getImageUrl(biz.logo)} className="w-24 h-24 object-contain mb-6 drop-shadow-xl group-hover:scale-110 transition-transform duration-500" alt="" />
                                <h4 className="text-xl font-extrabold text-white text-center group-hover:text-red-500 transition-colors">{biz.name}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectionLevel === 1 && (
                <div className="bg-white/10 backdrop-blur-3xl border border-white/30 shadow-2xl rounded-[3rem] p-6 md:p-12 animate-fade-in">
                    <h3 className="text-xl md:text-2xl font-extrabold text-white mb-8 flex items-center gap-3"><Component className="text-yellow-500" /> Enrolled Streams</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                        {getEnrolledStreams(selectedBusiness).map((stream, idx) => (
                            <div key={idx} onClick={() => { setSelectedStream(stream); setSelectionLevel(2); }} className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/10 hover:border-yellow-500 p-6 md:p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-6 cursor-pointer transition-all duration-500 group shadow-lg hover:shadow-2xl hover:-translate-y-1">
                                <h4 className="text-xl font-extrabold text-white group-hover:text-yellow-600 transition-colors uppercase tracking-widest text-center sm:text-left">{stream}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectionLevel === 2 && (
                <div className="bg-white/10 backdrop-blur-3xl border border-white/30 shadow-2xl rounded-[3rem] p-6 md:p-12 animate-fade-in">
                    <h3 className="text-xl md:text-2xl font-extrabold text-white mb-8 flex items-center gap-3"><Layers className="text-red-500" /> Enrolled Batches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {getFilteredBatches().map(batch => (
                            <div key={batch.id} onClick={() => { setSelectedBatch(batch); setSelectionLevel(3); setActiveStream(selectedStream); }} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 hover:border-red-400 p-6 md:p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-6 cursor-pointer transition-all duration-500 group shadow-lg hover:shadow-2xl hover:-translate-y-1">
                                <div className="w-20 h-20 bg-black/20 backdrop-blur-xl rounded-[1.5rem] p-4 border border-white/20 shrink-0 shadow-inner group-hover:rotate-3 transition-transform duration-500">
                                    <img src={getImageUrl(batch.logo || selectedBusiness?.logo)} className="w-full h-full object-contain" alt="" />
                                </div>
                                <div className="text-center sm:text-left min-w-0">
                                    <h4 className="text-xl font-extrabold text-white group-hover:text-red-500 transition-colors truncate">{batch.name}</h4>
                                    <p className="text-xs text-white/80 font-bold mt-2 bg-white/10 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-xl w-max mx-auto sm:mx-0 shadow-sm">Click to view subjects</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectionLevel === 3 && (
                <div className="bg-white/10 backdrop-blur-3xl border border-white/30 shadow-2xl rounded-[3rem] p-6 md:p-12 animate-fade-in">
                    <div className="mb-10">
                        <h4 className="text-sm font-bold text-white/80 font-medium mb-4 uppercase tracking-wider">Filter by Stream</h4>
                        <div className="flex flex-wrap gap-3">
                            {['All', ...Array.from(new Set(selectedBatch?.groups?.flatMap(g => g.courses?.map(c => c.stream).filter(Boolean))))].map(stream => (
                                <button key={stream} onClick={() => setActiveStream(stream)}
                                    className={`px-6 py-3 rounded-[1rem] font-extrabold text-xs transition-all duration-300 shadow-sm hover:shadow-md ${activeStream === stream
                                        ? 'bg-red-600 text-white border border-red-500 scale-105'
                                        : 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 text-white/80 hover:from-white/20 hover:to-white/10 hover:text-white hover:-translate-y-1'
                                        }`}>
                                    {stream}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {renderGroupedCourses()}
                    </div>
                </div>
            )}
        </div>
    );
}