import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Download, Edit2, Trash2, Box, X, Loader2, Check, BarChart3,
    ChevronRight, ChevronDown, BookOpen, Plus, FileText, ArrowLeft,
    Users, CreditCard, Edit3, Search, Layers, LayoutGrid, Table,
    AlertTriangle, Building, Package, RefreshCw, Truck, ArrowUpDown, Clock
} from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

const LiveTuteImage = ({ stock, masterData, className = "w-full h-full object-cover" }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [errorStage, setErrorStage] = useState(0);

    useEffect(() => {
        let coverName = null;
        let actualTuteName = stock.tuteName?.replace(/\[.*?\]/g, '').trim();

        // 1. Get mapping from groupPrices
        if (stock.course?.groupPrices && stock.course?.groupId) {
            try {
                const gp = typeof stock.course.groupPrices === 'string' ? JSON.parse(stock.course.groupPrices) : stock.course.groupPrices;
                const match = gp.find(g => parseInt(g.groupId) === parseInt(stock.course.groupId));
                if (match) {
                    if (match.tuteName) {
                        actualTuteName = match.tuteName;
                    }
                    if (match.tuteCover && match.tuteCover !== 'default-tute.png' && match.tuteCover !== 'null') {
                        coverName = match.tuteCover;
                    }
                }
            } catch (e) { }
        }

        // 2. Resolve against MasterTutes using mapped name
        const lecName = stock.course?.lecturerName || stock.lecturerName;
        if (masterData && lecName) {
            const lec = masterData.find(l => l.name === lecName);
            if (lec) {
                const tData = lec.tutes?.find(t => t.name === actualTuteName || t.name === stock.tuteName);
                if (tData && tData.image) {
                    coverName = tData.image;
                }
            }
        }

        // 3. Overwrite with TuteStock's own image if explicitly set
        if (stock.tuteImage && stock.tuteImage !== 'default-tute.png' && stock.tuteImage !== 'null') {
            coverName = stock.tuteImage;
        }

        if (!coverName || coverName === 'default-tute.png' || coverName === 'null') {
            setImgSrc(null);
        } else {
            const baseUrl = axios.defaults.baseURL.replace('/api', '');
            setImgSrc(`${baseUrl}/storage/documents/${coverName}`);
        }
    }, [stock, masterData]);

    const handleError = () => {
        if (errorStage === 0 && imgSrc) {
            setImgSrc(imgSrc.replace('/storage/documents/', '/storage/images/'));
            setErrorStage(1);
        } else if (errorStage === 1 && imgSrc) {
            setImgSrc(imgSrc.replace('/storage/images/', '/storage/icons/'));
            setErrorStage(2);
        } else {
            setImgSrc(null);
        }
    };

    if (!imgSrc) return <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold whitespace-nowrap text-center px-1">No Cover</span>;

    return <img src={imgSrc} onError={handleError} alt="Cover" className={className} />;
};

const LecturerImage = ({ image, name }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [errorStage, setErrorStage] = useState(0);

    useEffect(() => {
        if (!image || image === 'null' || image === 'default.png') {
            setImgSrc(null);
        } else {
            const baseUrl = axios.defaults.baseURL.replace('/api', '');
            setImgSrc(`${baseUrl}/storage/icons/${image}`);
        }
    }, [image]);

    const handleError = () => {
        const baseUrl = axios.defaults.baseURL.replace('/api', '');
        if (errorStage === 0 && imgSrc) {
            setImgSrc(`${baseUrl}/storage/images/${image}`);
            setErrorStage(1);
        } else if (errorStage === 1 && imgSrc) {
            setImgSrc(`${baseUrl}/storage/documents/${image}`);
            setErrorStage(2);
        } else {
            setImgSrc(null);
        }
    };

    if (!imgSrc) {
        return (
            <div className="w-24 h-24 bg-gradient-to-br from-brand-accent to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg mb-4 transition-transform group-hover:scale-110 duration-300 shrink-0">
                {(name || '??').substring(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0 bg-gray-100 dark:bg-black/20">
            <img src={imgSrc} onError={handleError} alt={name} className="w-full h-full object-cover" />
        </div>
    );
};

const SmartLecturerAvatar = ({ image, name, size = "w-7 h-7", textSize = "text-[10px]" }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [errStage, setErrStage] = useState(0);

    useEffect(() => {
        if (!image || image === 'null' || image === 'default.png') {
            setImgSrc(null);
        } else {
            const baseUrl = axios.defaults.baseURL.replace('/api', '');
            setImgSrc(`${baseUrl}/storage/icons/${image}`);
        }
    }, [image]);

    const handleError = () => {
        const baseUrl = axios.defaults.baseURL.replace('/api', '');
        if (errStage === 0 && imgSrc) {
            setImgSrc(`${baseUrl}/storage/images/${image}`);
            setErrStage(1);
        } else if (errStage === 1 && imgSrc) {
            setImgSrc(`${baseUrl}/storage/documents/${image}`);
            setErrStage(2);
        } else {
            setImgSrc(null);
        }
    };

    if (!imgSrc) {
        return (
            <div className={`${size} rounded-lg bg-gradient-to-br from-brand-accent to-purple-600 flex items-center justify-center text-white font-black ${textSize} shrink-0 shadow-xs`}>
                {(name || '??').substring(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <div className={`${size} rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 shadow-xs`}>
            <img src={imgSrc} onError={handleError} alt={name} className="w-full h-full object-cover" />
        </div>
    );
};

export default function TuteStock({ isReadOnly }) {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [globalStock, setGlobalStock] = useState([]);
    const [masterData, setMasterData] = useState([]);
    const [lecturerDeliveredMap, setLecturerDeliveredMap] = useState({});
    const [lecturerToSendMap, setLecturerToSendMap] = useState({});

    // View Mode: 'table' (Columns & Rows) vs 'tiles' (Card drill-down)
    const [viewMode, setViewMode] = useState(() => {
        try {
            return localStorage.getItem('tute_stock_view_mode') || 'table';
        } catch {
            return 'table';
        }
    });

    // Sub-view inside Table View: 'lecturer' (Grouped by lecturer) vs 'materials' (Flat list)
    const [tableViewType, setTableViewType] = useState('lecturer');

    // Table Filters & Sorting
    const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('All');
    const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('All');
    const [hazardOnlyFilter, setHazardOnlyFilter] = useState(false);
    const [expandedLecturers, setExpandedLecturers] = useState(new Set());
    const [sortField, setSortField] = useState('name');
    const [sortAsc, setSortAsc] = useState(true);

    // Modals
    const [showTuteModal, setShowTuteModal] = useState(false);
    const [tuteFormData, setTuteFormData] = useState({ id: null, courseId: '', lecturerName: '', paymentGroup: 'Monthly', tuteName: '', itemOrder: 1, imageFile: null, imageFile2: null });
    const [showLecModal, setShowLecModal] = useState(false);
    const [lecFormData, setLecFormData] = useState({ oldName: '', newName: '', imageFile: null });

    // Tile View Navigation State (1: Lecturer, 2: Payment Type, 3: Stocks)
    const [viewLevel, setViewLevel] = useState(1);
    const [selectedLecturer, setSelectedLecturer] = useState(null);
    const [selectedPaymentGroup, setSelectedPaymentGroup] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Stock Actions Inputs & Modals
    const [stockInputs, setStockInputs] = useState({});
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ id: null, originalIds: [], qty: '', reason: '' });

    // Reports Modal
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportFilters, setReportFilters] = useState({ dateType: 'this_month', startDate: '', endDate: '', businessId: '', batchId: '', paymentType: '' });
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        fetchGlobalStock();
        setMonthDates('this_month');
    }, []);

    const fetchGlobalStock = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admin/delivery/stock/global');
            if (Array.isArray(res.data)) {
                setGlobalStock(res.data);
            } else {
                setGlobalStock(res.data.stocks || []);
                setMasterData(res.data.masterData || []);
                if (res.data.lecturerDeliveredMap) {
                    setLecturerDeliveredMap(res.data.lecturerDeliveredMap);
                }
                if (res.data.lecturerToSendMap) {
                    setLecturerToSendMap(res.data.lecturerToSendMap);
                }
            }
        } catch {
            toast.error("Failed to load global stock");
        } finally {
            setLoading(false);
        }
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        try {
            localStorage.setItem('tute_stock_view_mode', mode);
        } catch { }
    };

    // =========================================================================
    // TABLE VIEW DATA PROCESSING (Grouped by Lecturer & Materials)
    // =========================================================================
    const tableLecturerData = useMemo(() => {
        const lecMap = new Map();
        const lecImages = new Map();

        globalStock.forEach(s => {
            const lecName = s.course?.lecturerName?.trim() || "General / Unassigned";
            const bizName = s.course?.group?.batch?.business?.name;
            const batchName = s.course?.group?.batch?.name;
            const isMonthly = s.course?.group?.type === 1;
            const paymentType = isMonthly ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Other';

            if (!lecMap.has(lecName)) {
                lecMap.set(lecName, {
                    name: lecName,
                    businesses: new Set(),
                    batches: new Set(),
                    tuteMap: new Map()
                });
            }
            const lec = lecMap.get(lecName);
            if (bizName && bizName !== 'Unknown') lec.businesses.add(bizName);
            if (batchName && batchName !== 'N/A') lec.batches.add(batchName);

            if (!lecImages.has(lecName) && s.course?.groupPrices) {
                try {
                    const gp = typeof s.course.groupPrices === 'string' ? JSON.parse(s.course.groupPrices) : s.course.groupPrices;
                    const lImg = gp.find(g => g.lecturerImage)?.lecturerImage;
                    if (lImg && lImg !== 'null' && lImg !== 'default.png') lecImages.set(lecName, lImg);
                } catch (e) { }
            }

            // Group by paymentType + normalized tuteName to eliminate accidental duplicates
            const normTute = (s.tuteName || '').toLowerCase().replace(/\s+/g, ' ').trim();
            const tuteGroupKey = `${paymentType}:::${normTute}`;

            if (!lec.tuteMap.has(tuteGroupKey)) {
                lec.tuteMap.set(tuteGroupKey, {
                    id: s.id,
                    originalIds: [s.id],
                    courseId: s.courseId,
                    courseName: s.course?.name || "General Course",
                    businessName: bizName || "General",
                    batchName: batchName || "General",
                    paymentType,
                    tuteName: s.tuteName,
                    tuteImage: s.tuteImage,
                    tuteImage2: s.tuteImage2,
                    availableQuantity: s.availableQuantity || 0,
                    totalDelivered: s.totalDelivered || 0,
                    totalToSend: s.totalToSend || 0,
                    itemOrder: s.itemOrder || 1,
                    rawStock: s,
                    lecturerName: lecName
                });
            } else {
                const existing = lec.tuteMap.get(tuteGroupKey);
                existing.availableQuantity += (s.availableQuantity || 0);
                existing.totalDelivered += (s.totalDelivered || 0);
                existing.totalToSend += (s.totalToSend || 0);
                existing.originalIds.push(s.id);
                if ((s.itemOrder || 1) > (existing.itemOrder || 1)) {
                    existing.itemOrder = s.itemOrder;
                }
                if (s.tuteImage && s.tuteImage !== 'null' && (!existing.tuteImage || existing.tuteImage === 'null')) {
                    existing.tuteImage = s.tuteImage;
                }
                if (s.tuteImage2 && s.tuteImage2 !== 'null' && (!existing.tuteImage2 || existing.tuteImage2 === 'null')) {
                    existing.tuteImage2 = s.tuteImage2;
                }
            }
        });

        // Add any masterData lecturers that might not have stock records yet
        if (Array.isArray(masterData)) {
            masterData.forEach(mData => {
                if (mData && mData.name && !lecMap.has(mData.name)) {
                    lecMap.set(mData.name, {
                        name: mData.name,
                        businesses: new Set(),
                        batches: new Set(),
                        tuteMap: new Map()
                    });
                }
            });
        }

        const result = [];
        lecMap.forEach((data, lecName) => {
            const mData = masterData && Array.isArray(masterData) ? masterData.find(m => m.name === lecName) : null;
            const image = lecImages.get(lecName) || mData?.image || null;
            const tutes = Array.from(data.tuteMap.values()).sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));

            const monthlyTutes = tutes.filter(t => t.paymentType === 'Monthly');
            const fullTutes = tutes.filter(t => t.paymentType === 'Full Payment');

            const totalStock = tutes.reduce((sum, t) => sum + (t.availableQuantity || 0), 0);
            const monthlyStock = monthlyTutes.reduce((sum, t) => sum + (t.availableQuantity || 0), 0);
            const fullStock = fullTutes.reduce((sum, t) => sum + (t.availableQuantity || 0), 0);

            const normLec = (lecName || '').replace(/[\u2013\u2014\u2212]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
            const delStats = lecturerDeliveredMap[normLec] || null;
            const toSendStats = lecturerToSendMap[normLec] || null;

            const totalDelivered = delStats ? delStats.total : tutes.reduce((sum, t) => sum + (t.totalDelivered || 0), 0);
            const monthlyDelivered = delStats ? delStats.monthly : monthlyTutes.reduce((sum, t) => sum + (t.totalDelivered || 0), 0);
            const fullDelivered = delStats ? delStats.full : fullTutes.reduce((sum, t) => sum + (t.totalDelivered || 0), 0);

            const totalToSend = toSendStats ? toSendStats.total : tutes.reduce((sum, t) => sum + (t.totalToSend || 0), 0);
            const monthlyToSend = toSendStats ? toSendStats.monthly : monthlyTutes.reduce((sum, t) => sum + (t.totalToSend || 0), 0);
            const fullToSend = toSendStats ? toSendStats.full : fullTutes.reduce((sum, t) => sum + (t.totalToSend || 0), 0);

            const hazardTutes = tutes.filter(t => (t.availableQuantity || 0) < 10);
            const hazardCount = hazardTutes.length;
            const hasHazard = hazardCount > 0;

            result.push({
                name: lecName,
                image,
                businesses: Array.from(data.businesses),
                batches: Array.from(data.batches),
                tutes,
                totalStock,
                monthlyStock,
                fullStock,
                totalDelivered,
                monthlyDelivered,
                fullDelivered,
                totalToSend,
                monthlyToSend,
                fullToSend,
                materialsCount: tutes.length,
                monthlyCount: monthlyTutes.length,
                fullCount: fullTutes.length,
                hasHazard,
                hazardCount
            });
        });

        return result;
    }, [globalStock, masterData, lecturerDeliveredMap, lecturerToSendMap]);

    const availableBusinesses = useMemo(() => {
        const bSet = new Set();
        tableLecturerData.forEach(l => l.businesses.forEach(b => bSet.add(b)));
        return Array.from(bSet).sort();
    }, [tableLecturerData]);

    // Filtered lecturers based on query, business, payment, and hazard filters
    const filteredTableLecturers = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        return tableLecturerData
            .map(lec => {
                // Filter by business
                if (selectedBusinessFilter !== 'All') {
                    if (!lec.businesses.includes(selectedBusinessFilter)) return null;
                }

                // Filter inner tutes
                const matchingTutes = lec.tutes.filter(t => {
                    if (hazardOnlyFilter && (t.availableQuantity || 0) >= 10) return false;
                    if (selectedPaymentFilter !== 'All') {
                        if (selectedPaymentFilter === 'Monthly' && t.paymentType !== 'Monthly') return false;
                        if (selectedPaymentFilter === 'Full' && t.paymentType !== 'Full Payment') return false;
                    }
                    if (q) {
                        const matchLec = lec.name.toLowerCase().includes(q);
                        const matchTute = (t.tuteName || '').toLowerCase().includes(q);
                        const matchCourse = (t.courseName || '').toLowerCase().includes(q);
                        const matchBiz = (t.businessName || '').toLowerCase().includes(q);
                        if (!matchLec && !matchTute && !matchCourse && !matchBiz) return false;
                    }
                    return true;
                });

                // If filtering is active and no materials match, hide this lecturer unless the lecturer's name itself matched
                if ((q || hazardOnlyFilter || selectedPaymentFilter !== 'All') && matchingTutes.length === 0) {
                    if (!q || !lec.name.toLowerCase().includes(q)) return null;
                }

                const monthlyTutes = matchingTutes.filter(t => t.paymentType === 'Monthly');
                const fullTutes = matchingTutes.filter(t => t.paymentType === 'Full Payment');

                const isAllMatching = matchingTutes.length === lec.tutes.length;
                const displayDelivered = (isAllMatching && lec.totalDelivered) ? lec.totalDelivered : matchingTutes.reduce((sum, t) => sum + (t.totalDelivered || 0), 0);
                const displayMonthlyDelivered = (isAllMatching && lec.monthlyDelivered) ? lec.monthlyDelivered : monthlyTutes.reduce((sum, t) => sum + (t.totalDelivered || 0), 0);
                const displayFullDelivered = (isAllMatching && lec.fullDelivered) ? lec.fullDelivered : fullTutes.reduce((sum, t) => sum + (t.totalDelivered || 0), 0);

                const displayToSend = (isAllMatching && lec.totalToSend) ? lec.totalToSend : matchingTutes.reduce((sum, t) => sum + (t.totalToSend || 0), 0);
                const displayMonthlyToSend = (isAllMatching && lec.monthlyToSend) ? lec.monthlyToSend : monthlyTutes.reduce((sum, t) => sum + (t.totalToSend || 0), 0);
                const displayFullToSend = (isAllMatching && lec.fullToSend) ? lec.fullToSend : fullTutes.reduce((sum, t) => sum + (t.totalToSend || 0), 0);

                return {
                    ...lec,
                    displayTutes: matchingTutes,
                    displayStock: matchingTutes.reduce((sum, t) => sum + (t.availableQuantity || 0), 0),
                    displayDelivered,
                    displayMonthlyStock: monthlyTutes.reduce((sum, t) => sum + (t.availableQuantity || 0), 0),
                    displayFullStock: fullTutes.reduce((sum, t) => sum + (t.availableQuantity || 0), 0),
                    displayMonthlyDelivered,
                    displayFullDelivered,
                    displayToSend,
                    displayMonthlyToSend,
                    displayFullToSend,
                    displayMaterialsCount: matchingTutes.length,
                    displayMonthlyCount: monthlyTutes.length,
                    displayFullCount: fullTutes.length,
                    displayHasHazard: matchingTutes.some(t => (t.availableQuantity || 0) < 10),
                    displayHazardCount: matchingTutes.filter(t => (t.availableQuantity || 0) < 10).length
                };
            })
            .filter(Boolean);
    }, [tableLecturerData, searchQuery, selectedBusinessFilter, selectedPaymentFilter, hazardOnlyFilter]);

    // Sorted table lecturers
    const sortedTableLecturers = useMemo(() => {
        return [...filteredTableLecturers].sort((a, b) => {
            let valA, valB;
            if (sortField === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sortField === 'tutesCount') {
                valA = a.displayMaterialsCount;
                valB = b.displayMaterialsCount;
            } else if (sortField === 'totalDelivered') {
                valA = a.displayDelivered;
                valB = b.displayDelivered;
            } else if (sortField === 'totalToSend') {
                valA = a.displayToSend;
                valB = b.displayToSend;
            } else if (sortField === 'totalStock') {
                valA = a.displayStock;
                valB = b.displayStock;
            } else {
                return 0;
            }
            return sortAsc ? valA - valB : valB - valA;
        });
    }, [filteredTableLecturers, sortField, sortAsc]);

    // Flat list of all materials (for "All Materials" sub-view)
    const allTableMaterials = useMemo(() => {
        const flat = [];
        filteredTableLecturers.forEach(lec => {
            lec.displayTutes.forEach(t => {
                flat.push({
                    ...t,
                    lecturerName: lec.name,
                    lecturerImage: lec.image
                });
            });
        });
        return flat.sort((a, b) => {
            if (sortField === 'name') {
                return sortAsc ? a.tuteName.localeCompare(b.tuteName) : b.tuteName.localeCompare(a.tuteName);
            } else if (sortField === 'totalStock') {
                return sortAsc ? a.availableQuantity - b.availableQuantity : b.availableQuantity - a.availableQuantity;
            } else if (sortField === 'totalDelivered') {
                return sortAsc ? a.totalDelivered - b.totalDelivered : b.totalDelivered - a.totalDelivered;
            } else if (sortField === 'totalToSend') {
                return sortAsc ? (a.totalToSend || 0) - (b.totalToSend || 0) : (b.totalToSend || 0) - (a.totalToSend || 0);
            }
            return (a.itemOrder || 1) - (b.itemOrder || 1);
        });
    }, [filteredTableLecturers, sortField, sortAsc]);

    // Computed Summary Stats for Cards
    const tableSummary = useMemo(() => {
        let totalLecs = filteredTableLecturers.length;
        let totalMats = 0;
        let totalDelivered = 0;
        let totalToSend = 0;
        let totalStock = 0;
        let totalFullStock = 0;
        let totalMonthlyStock = 0;
        let totalFullDel = 0;
        let totalMonthlyDel = 0;
        let totalFullToSend = 0;
        let totalMonthlyToSend = 0;
        let totalHazard = 0;

        filteredTableLecturers.forEach(l => {
            totalMats += l.displayMaterialsCount;
            totalDelivered += l.displayDelivered;
            totalToSend += (l.displayToSend || 0);
            totalStock += l.displayStock;
            totalFullStock += l.displayFullStock;
            totalMonthlyStock += l.displayMonthlyStock;
            totalFullDel += l.displayFullDelivered;
            totalMonthlyDel += l.displayMonthlyDelivered;
            totalFullToSend += (l.displayFullToSend || 0);
            totalMonthlyToSend += (l.displayMonthlyToSend || 0);
            totalHazard += l.displayHazardCount;
        });

        return {
            totalLecs,
            totalMats,
            totalDelivered,
            totalToSend,
            totalStock,
            totalFullStock,
            totalMonthlyStock,
            totalFullDel,
            totalMonthlyDel,
            totalFullToSend,
            totalMonthlyToSend,
            totalHazard
        };
    }, [filteredTableLecturers]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(field === 'name');
        }
    };

    const toggleLecturerExpand = (name) => {
        setExpandedLecturers(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const toggleExpandAll = () => {
        if (expandedLecturers.size >= filteredTableLecturers.length) {
            setExpandedLecturers(new Set());
        } else {
            setExpandedLecturers(new Set(filteredTableLecturers.map(l => l.name)));
        }
    };

    // =========================================================================
    // TILE VIEW DATA PROCESSING (Card Drill-Down: Level 1 -> 2 -> 3)
    // =========================================================================
    const lecturers = useMemo(() => {
        const lecMap = new Map();
        const lecImages = new Map();
        globalStock.forEach(s => {
            const name = s.course?.lecturerName || "Unknown Lecturer";
            const biz = s.course?.group?.batch?.business?.name || "Unknown";
            if (!lecMap.has(name)) lecMap.set(name, new Set());
            if (biz !== "Unknown") lecMap.get(name).add(biz);
            if (!lecImages.has(name) && s.course?.groupPrices) {
                try {
                    const gp = typeof s.course.groupPrices === 'string' ? JSON.parse(s.course.groupPrices) : s.course.groupPrices;
                    const lImg = gp.find(g => g.lecturerImage)?.lecturerImage;
                    if (lImg && lImg !== 'null' && lImg !== 'default.png') lecImages.set(name, lImg);
                } catch (e) { }
            }
        });

        if (Array.isArray(masterData)) {
            masterData.forEach(mData => {
                if (mData && mData.name && !lecMap.has(mData.name)) {
                    lecMap.set(mData.name, new Set());
                }
            });
        }

        return Array.from(lecMap.keys()).sort().map(name => {
            const mData = masterData && Array.isArray(masterData) ? masterData.find(m => m.name === name) : null;
            return {
                name,
                image: lecImages.get(name) || mData?.image || null,
                businesses: Array.from(lecMap.get(name))
            };
        });
    }, [globalStock, masterData, lecturerDeliveredMap]);

    const filteredLecturers = useMemo(() => {
        if (!searchQuery) return lecturers;
        return lecturers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [lecturers, searchQuery]);

    const paymentGroups = useMemo(() => {
        if (!selectedLecturer) return [];
        const pgs = new Set(['Monthly', 'Full Payment']);
        globalStock.forEach(s => {
            const lec = s.course?.lecturerName || "Unknown Lecturer";
            if (lec === selectedLecturer) {
                pgs.add(s.course?.group?.type === 1 ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Unknown');
            }
        });
        return Array.from(pgs).filter(p => p !== 'Unknown').sort().reverse();
    }, [globalStock, selectedLecturer]);

    const finalStocks = useMemo(() => {
        if (!selectedLecturer || !selectedPaymentGroup) return [];

        const filtered = globalStock.filter(s => {
            const lec = s.course?.lecturerName || "Unknown Lecturer";
            const pg = s.course?.group?.type === 1 ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Unknown';

            let matchesSearch = true;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const courseName = (s.course?.name || "").toLowerCase();
                const tuteName = (s.tuteName || "").toLowerCase();
                matchesSearch = courseName.includes(q) || tuteName.includes(q);
            }

            return lec === selectedLecturer && pg === selectedPaymentGroup && matchesSearch;
        });

        const grouped = {};
        filtered.forEach(s => {
            const normalizedName = (s.tuteName || "").toLowerCase().replace(/\s+/g, ' ').trim();
            if (!grouped[normalizedName]) {
                grouped[normalizedName] = {
                    ...s,
                    course: { ...s.course },
                    originalIds: [s.id],
                    courseIds: [s.courseId]
                };
            } else {
                grouped[normalizedName].availableQuantity += s.availableQuantity;
                grouped[normalizedName].originalIds.push(s.id);
                grouped[normalizedName].courseIds.push(s.courseId);
                if ((s.itemOrder || 1) > (grouped[normalizedName].itemOrder || 1)) {
                    grouped[normalizedName].itemOrder = s.itemOrder;
                }
                if (s.tuteImage && s.tuteImage !== 'null' && (!grouped[normalizedName].tuteImage || grouped[normalizedName].tuteImage === 'null')) {
                    grouped[normalizedName].tuteImage = s.tuteImage;
                }
            }
        });

        return Object.values(grouped).sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));
    }, [globalStock, selectedLecturer, selectedPaymentGroup, searchQuery]);

    // Navigation Handlers for Tile View
    const handleLecturerClick = (lecName) => {
        setSelectedLecturer(lecName);
        setSelectedPaymentGroup(null);
        setSearchQuery('');
        setViewLevel(2);
    };

    const handlePaymentGroupClick = (pg) => {
        setSelectedPaymentGroup(pg);
        setSearchQuery('');
        setViewLevel(3);
    };

    const goToLevel = (level) => {
        setSearchQuery('');
        if (level === 1) {
            setSelectedLecturer(null);
            setSelectedPaymentGroup(null);
            setViewLevel(1);
        } else if (level === 2 && selectedLecturer) {
            setSelectedPaymentGroup(null);
            setViewLevel(2);
        }
    };

    // Helper to find courseId for quick add tute
    const getAutoCourseIdForLecturer = (lecName, paymentGroup = 'Monthly') => {
        const matching = globalStock.find(s => {
            const l = s.course?.lecturerName || "";
            const pg = s.course?.group?.type === 1 ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Unknown';
            return l === lecName && pg === paymentGroup;
        });
        if (matching?.course?.id) return matching.course.id;
        const anyCourse = globalStock.find(s => (s.course?.lecturerName || '') === lecName);
        return anyCourse?.course?.id || '';
    };

    const getAutoCourseId = () => {
        return getAutoCourseIdForLecturer(selectedLecturer, selectedPaymentGroup || 'Monthly');
    };

    // =========================================================================
    // STOCK MUTATION OPERATIONS
    // =========================================================================
    const handleAddStock = async (stockId) => {
        const qty = parseInt(stockInputs[stockId]);
        if (!qty || isNaN(qty) || qty <= 0) return toast.error("Enter a valid quantity!");
        setActionLoading(true);
        try {
            await axios.post('/admin/delivery/stock/add', { stockId, quantity: qty, reason: "New printed stock added" });
            toast.success("Stock Added Successfully!");
            setStockInputs(prev => ({ ...prev, [stockId]: '' }));
            fetchGlobalStock();
        } catch {
            toast.error("Failed to update stock");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditStockSubmit = async (e) => {
        e.preventDefault();
        if (!editData.reason) return toast.error("A reason is required!");
        setActionLoading(true);
        try {
            await axios.put('/admin/delivery/stock/edit', {
                stockId: editData.id,
                originalIds: editData.originalIds,
                newQuantity: editData.qty,
                reason: editData.reason
            });
            toast.success("Stock Adjusted Successfully!");
            setShowEditModal(false);
            fetchGlobalStock();
        } catch {
            toast.error("Failed to adjust stock");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteStock = async (stockId) => {
        const reason = window.prompt("Why are you deleting this item? (Required)");
        if (!reason) return toast.error("Deletion cancelled.");
        try {
            await axios.delete(`/delete-tute/${stockId}`);
            toast.success("Stock Item Deleted!");
            fetchGlobalStock();
        } catch {
            toast.error("Failed to delete item");
        }
    };

    const handleClearAllStock = async () => {
        if (!window.confirm("⚠️ ARE YOU SURE YOU WANT TO CLEAR ALL TUTE STOCK?\n\nThis will remove all stock items so you can start fresh. Past/Pending Deliveries will NOT be affected.")) return;
        setActionLoading(true);
        try {
            await axios.delete('/admin/delivery/stock/clear-all');
            toast.success("All TuteStock records cleared!");
            fetchGlobalStock();
        } catch {
            toast.error("Failed to clear stock");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteLecturer = async (oldName) => {
        if (!window.confirm(`Are you sure you want to delete ${oldName}?`)) return;
        setActionLoading(true);
        try {
            await axios.delete(`/lecturer/delete/${encodeURIComponent(oldName)}`);
            toast.success("Lecturer deleted");
            fetchGlobalStock();
        } catch {
            toast.error("Failed to delete");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLecSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const fd = new FormData();
            fd.append('oldName', lecFormData.oldName);
            fd.append('newName', lecFormData.newName);
            if (lecFormData.imageFile) fd.append('image', lecFormData.imageFile);
            await axios.put('/lecturer/update', fd);
            toast.success("Lecturer updated");
            setShowLecModal(false);
            fetchGlobalStock();
        } catch {
            toast.error("Failed to update lecturer");
        } finally {
            setActionLoading(false);
        }
    };

    const handleTuteSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const fd = new FormData();
            if (tuteFormData.id) fd.append('id', tuteFormData.id);
            if (tuteFormData.courseId) fd.append('courseId', tuteFormData.courseId);
            if (tuteFormData.lecturerName) fd.append('lecturerName', tuteFormData.lecturerName);
            if (tuteFormData.paymentGroup) fd.append('paymentGroup', tuteFormData.paymentGroup);
            fd.append('tuteName', tuteFormData.tuteName);
            fd.append('itemOrder', tuteFormData.itemOrder);
            if (tuteFormData.imageFile) fd.append('tuteImage', tuteFormData.imageFile);
            if (tuteFormData.imageFile2) fd.append('tuteImage2', tuteFormData.imageFile2);

            if (tuteFormData.id) {
                await axios.put('/edit-tute', fd);
                toast.success("Tute Updated");
            } else {
                await axios.post('/create-tute', fd);
                toast.success("Tute Created");
            }
            setShowTuteModal(false);
            fetchGlobalStock();
        } catch {
            toast.error("Failed to save tute");
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================================================
    // ADVANCED REPORT FUNCTIONS
    // =========================================================================
    const setMonthDates = (type) => {
        const today = new Date();
        let start, end;
        if (type === 'this_month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (type === 'last_month') {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
        } else return;
        setReportFilters(prev => ({
            ...prev,
            dateType: type,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        }));
    };

    const generateReport = async () => {
        setReportLoading(true);
        try {
            const params = new URLSearchParams({
                startDate: reportFilters.startDate,
                endDate: reportFilters.endDate,
                paymentType: reportFilters.paymentType
            });
            const res = await axios.get(`/admin/delivery/stock/report?${params.toString()}`);
            setReportData(res.data || []);
            if (res.data.length === 0) toast("No deliveries found for this criteria.", { icon: 'ℹ️' });
        } catch {
            toast.error("Failed to generate report");
        } finally {
            setReportLoading(false);
        }
    };

    const exportReportCSV = () => {
        if (reportData.length === 0) return toast.error("No data to export");
        const headers = ["Business", "Batch", "Payment Group", "Subject Name", "Tute Name", "Total Delivered/Packed", "Remaining Stock"];
        const rows = reportData.map(r => `"${r.businessName}","${r.batchName}","${r.paymentType}","${r.courseName}","${r.tuteName}","${r.deliveredQty}","${r.currentStock}"`);
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Delivery_Report_${reportFilters.startDate}_to_${reportFilters.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Breadcrumbs for Tile View
    const Breadcrumbs = () => (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-colors text-xs font-bold text-gray-500 dark:text-slate-400">
            <button onClick={() => goToLevel(1)} className={`hover:text-brand-accent transition-colors flex items-center gap-1.5 ${viewLevel === 1 ? 'text-brand-accent font-black' : ''}`}>
                <Users size={14} className={viewLevel === 1 ? "text-brand-accent" : "opacity-50"} /> Lecturers
            </button>
            {selectedLecturer && <>
                <ChevronRight size={14} className="opacity-50" />
                <button onClick={() => goToLevel(2)} className={`hover:text-brand-accent transition-colors flex items-center gap-1.5 ${viewLevel === 2 ? 'text-brand-accent font-black' : ''}`}>
                    <Layers size={14} className={viewLevel === 2 ? "text-brand-accent" : "opacity-50"} /> {selectedLecturer}
                </button>
            </>}
            {selectedPaymentGroup && <>
                <ChevronRight size={14} className="opacity-50" />
                <span className="text-brand-accent font-black flex items-center gap-1.5">
                    <BookOpen size={14} /> {selectedPaymentGroup}
                </span>
            </>}
        </div>
    );

    return (
        <div className="w-full text-gray-900 dark:text-slate-200 animate-in fade-in duration-300 font-sans h-[85vh] flex flex-col transition-colors relative z-10">

            {/* Top Toolbar */}
            <div className="mb-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {viewMode === 'tiles' && viewLevel > 1 && (
                        <button onClick={() => goToLevel(viewLevel - 1)} className="p-2 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:text-brand-accent dark:hover:text-brand-accent transition-all shadow-sm shrink-0 hover:scale-105 active:scale-95">
                            <ArrowLeft size={16} />
                        </button>
                    )}

                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-72 sm:flex-initial">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder={viewMode === 'table' ? "Search lecturer, material, course..." : viewLevel === 1 ? "Search lecturers..." : "Search tutes..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-8 py-2 text-xs font-bold text-gray-900 dark:text-slate-200 outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-all shadow-sm placeholder-gray-400 dark:placeholder-slate-500 h-[38px]"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* View Mode Toggle: Columns & Rows (Table) vs Tile View (Cards) */}
                    <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10 shrink-0">
                        <button
                            onClick={() => handleViewModeChange('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${viewMode === 'table'
                                ? 'bg-brand-accent text-white shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            title="Switch to Columns & Rows Table View (Modeled after Stock Reports)"
                        >
                            <Table size={13} />
                            Columns &amp; Rows
                        </button>
                        <button
                            onClick={() => handleViewModeChange('tiles')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${viewMode === 'tiles'
                                ? 'bg-brand-accent text-white shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            title="Switch to Tile Grid View"
                        >
                            <LayoutGrid size={13} />
                            Tile View
                        </button>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
                    <button
                        onClick={fetchGlobalStock}
                        disabled={loading}
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 bg-white/80 dark:bg-black/40 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-white/10 hover:border-brand-accent/50 disabled:opacity-50 transition-all shadow-sm h-[38px]"
                        title="Reload latest data"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin text-brand-accent' : ''} />
                        Refresh
                    </button>

                    <button
                        onClick={() => setShowReportModal(true)}
                        className="px-3 py-2 bg-white/80 dark:bg-black/40 text-gray-700 dark:text-slate-300 hover:text-brand-accent border border-gray-200 dark:border-white/10 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm h-[38px]"
                    >
                        <BarChart3 size={14} /> Reports
                    </button>

                    {!isReadOnly && (
                        <>
                            <button onClick={handleClearAllStock} className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 px-3 py-2 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 shrink-0 justify-center h-[38px]">
                                <Trash2 size={13} /> Clear Stock
                            </button>
                            <button onClick={() => { setLecFormData({ oldName: '', newName: '', imageFile: null }); setShowLecModal(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-purple-600/30 hover:scale-105 active:scale-95 shrink-0 justify-center h-[38px]">
                                <Plus size={14} /> Add Lecturer
                            </button>
                            <button onClick={() => { setTuteFormData({ id: null, courseId: getAutoCourseId(), lecturerName: selectedLecturer || '', paymentGroup: selectedPaymentGroup || 'Monthly', tuteName: '', itemOrder: 1, imageFile: null, imageFile2: null }); setShowTuteModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/30 hover:scale-105 active:scale-95 shrink-0 justify-center h-[38px]">
                                <Plus size={14} /> Add Tute
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex-1 flex flex-col justify-center items-center">
                    <Loader2 className="animate-spin text-brand-accent mb-2" size={36} />
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Loading Inventory Data...</p>
                </div>
            ) : viewMode === 'table' ? (
                /* ========================================================================= */
                /* COLUMNS & ROWS TABLE VIEW (Modeled directly after StockReports.jsx)       */
                /* ========================================================================= */
                <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 shrink-0">
                        {/* Active Lecturers */}
                        <div className="bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm backdrop-blur-md flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <Users size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate">Active Lecturers</div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-0.5 truncate">
                                    {tableSummary.totalLecs}
                                    <span className="text-[10px] font-bold text-gray-400 ml-1">lecturers</span>
                                </div>
                            </div>
                        </div>

                        {/* Material Types */}
                        <div className="bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm backdrop-blur-md flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <Layers size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate">Material Types</div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-0.5 truncate">
                                    {tableSummary.totalMats}
                                    <span className="text-[10px] font-bold text-gray-400 ml-1">types</span>
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 truncate">
                                    Full &amp; Monthly Tutes
                                </div>
                            </div>
                        </div>

                        {/* Total Delivered */}
                        <div className="bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm backdrop-blur-md flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <Truck size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate">Total Delivered</div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-0.5 font-mono truncate">
                                    {tableSummary.totalDelivered.toLocaleString()}
                                    <span className="text-[10px] font-bold text-gray-400 font-sans ml-1">items</span>
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 mt-0.5 truncate flex items-center gap-1.5 font-mono">
                                    <span className="text-purple-400" title="Full Tutes Delivered">F: {tableSummary.totalFullDel.toLocaleString()}</span>
                                    <span className="text-gray-500/60">•</span>
                                    <span className="text-blue-400" title="Monthly Tutes Delivered">M: {tableSummary.totalMonthlyDel.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Orders to Send */}
                        <div className="bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm backdrop-blur-md flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <Clock size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate">Orders to Send</div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-0.5 font-mono truncate">
                                    {tableSummary.totalToSend.toLocaleString()}
                                    <span className="text-[10px] font-bold text-gray-400 font-sans ml-1">orders</span>
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 mt-0.5 truncate flex items-center gap-1.5 font-mono">
                                    <span className="text-purple-400" title="Full Tutes to Send">F: {tableSummary.totalFullToSend.toLocaleString()}</span>
                                    <span className="text-gray-500/60">•</span>
                                    <span className="text-blue-400" title="Monthly Tutes to Send">M: {tableSummary.totalMonthlyToSend.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Available Stock */}
                        <div className="bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm backdrop-blur-md flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <Package size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate">Available Stock</span>
                                    {tableSummary.totalHazard > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded animate-pulse" title="Critical low stock alert">
                                            <AlertTriangle size={9} /> {tableSummary.totalHazard} &lt; 10
                                        </span>
                                    )}
                                </div>
                                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono truncate">
                                    {tableSummary.totalStock.toLocaleString()}
                                    <span className="text-[10px] font-bold text-gray-400 font-sans ml-1">pcs</span>
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 mt-0.5 truncate flex items-center gap-1.5 font-mono">
                                    <span className="text-purple-400" title="Full Tutes Stock">F: {tableSummary.totalFullStock.toLocaleString()}</span>
                                    <span className="text-gray-500/60">•</span>
                                    <span className="text-blue-400" title="Monthly Tutes Stock">M: {tableSummary.totalMonthlyStock.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Filters Bar */}
                    <div className="bg-white/80 dark:bg-black/30 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-md shrink-0 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Business Filter */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-xs font-bold shadow-inner">
                                <Building size={13} className="text-brand-accent shrink-0" />
                                <span className="text-[10px] uppercase tracking-wider text-gray-400">Biz:</span>
                                <select
                                    value={selectedBusinessFilter}
                                    onChange={e => setSelectedBusinessFilter(e.target.value)}
                                    className="bg-transparent text-gray-900 dark:text-slate-100 outline-none cursor-pointer font-bold text-xs [color-scheme:light] dark:[color-scheme:dark]"
                                >
                                    <option value="All" className="bg-white dark:bg-[#15192b] text-gray-900 dark:text-slate-100 font-bold py-1">All Businesses</option>
                                    {availableBusinesses.map(b => (
                                        <option key={b} value={b} className="bg-white dark:bg-[#15192b] text-gray-900 dark:text-slate-100 font-bold py-1">{b}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Filter */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-xs font-bold shadow-inner">
                                <CreditCard size={13} className="text-brand-accent shrink-0" />
                                <span className="text-[10px] uppercase tracking-wider text-gray-400">Payment:</span>
                                <select
                                    value={selectedPaymentFilter}
                                    onChange={e => setSelectedPaymentFilter(e.target.value)}
                                    className="bg-transparent text-gray-900 dark:text-slate-100 outline-none cursor-pointer font-bold text-xs [color-scheme:light] dark:[color-scheme:dark]"
                                >
                                    <option value="All" className="bg-white dark:bg-[#15192b] text-gray-900 dark:text-slate-100 font-bold py-1">All Types</option>
                                    <option value="Monthly" className="bg-white dark:bg-[#15192b] text-gray-900 dark:text-slate-100 font-bold py-1">Monthly</option>
                                    <option value="Full" className="bg-white dark:bg-[#15192b] text-gray-900 dark:text-slate-100 font-bold py-1">Full Payment</option>
                                </select>
                            </div>

                            {/* Hazard Alert Filter Button */}
                            <button
                                onClick={() => setHazardOnlyFilter(!hazardOnlyFilter)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${hazardOnlyFilter
                                    ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                    : 'bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:border-rose-500/50'
                                    }`}
                                title="Show only materials with available stock < 10 pcs"
                            >
                                <AlertTriangle size={12} className={hazardOnlyFilter ? "text-white" : "text-rose-500"} />
                                <span>Hazard &lt; 10</span>
                                {tableSummary.totalHazard > 0 && (
                                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${hazardOnlyFilter ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-500'
                                        }`}>
                                        {tableSummary.totalHazard}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Sub-View Switcher: By Lecturer vs All Materials */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10 shrink-0">
                                <button
                                    onClick={() => setTableViewType('lecturer')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all ${tableViewType === 'lecturer'
                                        ? 'bg-brand-accent text-white shadow-sm'
                                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <Users size={12} />
                                    By Lecturer
                                </button>
                                <button
                                    onClick={() => setTableViewType('materials')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all ${tableViewType === 'materials'
                                        ? 'bg-brand-accent text-white shadow-sm'
                                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <Package size={12} />
                                    All Materials
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* MAIN TABLE CONTAINER */}
                    <div className="flex-1 bg-white/70 dark:bg-[#0c1017]/70 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 shadow-lg flex flex-col min-h-0 overflow-hidden">
                        {sortedTableLecturers.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400 dark:text-slate-500">
                                <FileText size={40} className="mb-2 opacity-30" />
                                <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300">No stock records found</h3>
                                <p className="text-[11px] mt-0.5 text-gray-500">Try adjusting your search query or filters.</p>
                            </div>
                        ) : tableViewType === 'lecturer' ? (
                            /* ================= VIEW 1: GROUPED BY LECTURER TABLE ================= */
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02] sticky top-0 z-20 backdrop-blur-md">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                        Showing {sortedTableLecturers.length} Lecturers
                                    </span>
                                    <button
                                        onClick={toggleExpandAll}
                                        className="text-[11px] font-bold text-brand-accent hover:underline flex items-center gap-1"
                                    >
                                        {expandedLecturers.size >= sortedTableLecturers.length ? 'Collapse All' : 'Expand All Lecturers'}
                                    </button>
                                </div>

                                <table className="w-full text-left border-collapse table-fixed">
                                    <colgroup>
                                        <col className="w-7" />                   {/* Chevron */}
                                        <col className="w-[21%]" />              {/* Lecturer */}
                                        <col className="w-[15%]" />              {/* Associated Businesses */}
                                        <col className="w-[9%]" />               {/* Materials count */}
                                        <col className="w-[11%]" />              {/* Delivered Qty */}
                                        <col className="w-[11%]" />              {/* To Send Qty */}
                                        <col className="w-[12%]" />              {/* Available Stock */}
                                        <col className="w-[17%]" />              {/* Quick Actions */}
                                    </colgroup>
                                    <thead className="bg-gray-100/90 dark:bg-black/60 backdrop-blur-md sticky top-[37px] border-b border-gray-200 dark:border-white/10 z-10">
                                        <tr className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            <th className="py-2.5 px-1 text-center"></th>
                                            <th className="py-2.5 px-2 font-black cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('name')}>
                                                <div className="flex items-center gap-1 truncate">
                                                    Lecturer <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-2 font-black truncate">Associated Businesses</th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('tutesCount')}>
                                                <div className="flex items-center justify-center gap-1 truncate">
                                                    Materials <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('totalDelivered')}>
                                                <div className="flex items-center justify-center gap-1 truncate" title="Total Delivered (Hover for Full vs Monthly breakdown)">
                                                    Delivered <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('totalToSend')}>
                                                <div className="flex items-center justify-center gap-1 truncate" title="Orders to Send (Approved/confirmed orders waiting to be dispatched)">
                                                    To Send <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('totalStock')}>
                                                <div className="flex items-center justify-center gap-1 truncate" title="Available Stock (Current physical inventory)">
                                                    Available Stock <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-2 text-right pr-3 font-black truncate">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {sortedTableLecturers.map((lec, idx) => {
                                            const isExpanded = expandedLecturers.has(lec.name);
                                            const tutes = lec.displayTutes;

                                            return (
                                                <React.Fragment key={lec.name}>
                                                    <tr
                                                        onClick={() => toggleLecturerExpand(lec.name)}
                                                        className={`cursor-pointer transition-colors ${isExpanded
                                                            ? 'bg-brand-accent/[0.04] dark:bg-brand-accent/[0.08]'
                                                            : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.03]'
                                                            }`}
                                                    >
                                                        <td className="py-2.5 px-1 text-center">
                                                            <span className="text-gray-400 transition-transform duration-200 inline-block">
                                                                {isExpanded ? <ChevronDown size={14} className="text-brand-accent" /> : <ChevronRight size={14} />}
                                                            </span>
                                                        </td>

                                                        {/* Lecturer Profile */}
                                                        <td className="py-2.5 px-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <SmartLecturerAvatar image={lec.image} name={lec.name} size="w-7 h-7" textSize="text-[10px]" />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="font-black text-gray-900 dark:text-white text-xs truncate" title={lec.name}>
                                                                            {lec.name}
                                                                        </span>
                                                                        {lec.displayHasHazard && (
                                                                            <span
                                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[8.5px] font-black uppercase tracking-wider shrink-0 animate-pulse"
                                                                                title={`Critical Hazard: ${lec.displayHazardCount} material type(s) have stock below 10 pcs!`}
                                                                            >
                                                                                <AlertTriangle size={10} className="text-rose-500 shrink-0" />
                                                                                <span>{lec.displayHazardCount} Hazard &lt; 10</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-gray-400 truncate">
                                                                        {tutes.length} registered tute type{tutes.length === 1 ? '' : 's'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Businesses */}
                                                        <td className="py-2.5 px-2">
                                                            <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                                                                {lec.businesses && lec.businesses.length > 0 ? (
                                                                    lec.businesses.slice(0, 2).map((b, bIdx) => (
                                                                        <span
                                                                            key={bIdx}
                                                                            title={b}
                                                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 truncate max-w-[120px]"
                                                                        >
                                                                            {b}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400 italic">General / All</span>
                                                                )}
                                                                {lec.businesses && lec.businesses.length > 2 && (
                                                                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-white/5 text-gray-400">
                                                                        +{lec.businesses.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Tute Types Count */}
                                                        <td className="py-2.5 px-1.5 text-center">
                                                            <div className="inline-flex flex-col items-center justify-center">
                                                                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-bold text-xs text-gray-700 dark:text-slate-300">
                                                                    {tutes.length} Types
                                                                </span>
                                                                <div className="flex items-center gap-1 text-[8.5px] font-mono text-gray-400 mt-0.5">
                                                                    <span className="text-purple-400" title={`Full: ${lec.displayFullCount} types`}>F:{lec.displayFullCount}</span>
                                                                    <span className="text-gray-500/50">•</span>
                                                                    <span className="text-blue-400" title={`Monthly: ${lec.displayMonthlyCount} types`}>M:{lec.displayMonthlyCount}</span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Delivered Qty with Hover Breakdown */}
                                                        <td className="py-2.5 px-1.5 text-center relative group">
                                                            <div className="inline-flex flex-col items-center justify-center cursor-help">
                                                                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 transition-all">
                                                                    {lec.displayDelivered.toLocaleString()} pcs
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[8.5px] font-mono font-bold mt-0.5 tracking-tight">
                                                                    <span className="text-purple-400" title={`Full Delivered: ${lec.displayFullDelivered}`}>F: {lec.displayFullDelivered}</span>
                                                                    <span className="text-gray-500/60">•</span>
                                                                    <span className="text-blue-400" title={`Monthly Delivered: ${lec.displayMonthlyDelivered}`}>M: {lec.displayMonthlyDelivered}</span>
                                                                </div>
                                                            </div>

                                                            {/* Floating Hover Card for Delivery */}
                                                            <div className={`opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-1/2 -translate-x-1/2 z-50 w-72 p-3 rounded-xl bg-gray-900/95 dark:bg-[#131b26]/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl text-left ${idx < 2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                                                                }`}>
                                                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 pb-1.5 mb-2 border-b border-white/10 flex items-center justify-between">
                                                                    <span className="flex items-center gap-1 text-blue-400">
                                                                        <Truck size={12} /> Delivery Breakdown
                                                                    </span>
                                                                    <span className="text-gray-300 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">Total: {lec.displayDelivered} pcs</span>
                                                                </div>
                                                                <div className="space-y-1.5 text-xs">
                                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                                        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                                                            Full Tutes Delivered:
                                                                        </span>
                                                                        <span className="font-mono font-black text-purple-200">
                                                                            {lec.displayFullDelivered.toLocaleString()} pcs
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                                        <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                                            Monthly Tutes Delivered:
                                                                        </span>
                                                                        <span className="font-mono font-black text-blue-200">
                                                                            {lec.displayMonthlyDelivered.toLocaleString()} pcs
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* To Send Qty (Approved / Confirmed Orders Waiting to be Dispatched) */}
                                                        <td className="py-2.5 px-1.5 text-center relative group">
                                                            <div className="inline-flex flex-col items-center justify-center cursor-help">
                                                                <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border flex items-center justify-center gap-1 transition-all ${lec.displayStock < lec.displayToSend
                                                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/35 font-black group-hover:border-rose-500/60'
                                                                        : lec.displayToSend > 0
                                                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 group-hover:border-amber-500/50'
                                                                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'
                                                                    }`}>
                                                                    {lec.displayStock < lec.displayToSend && <AlertTriangle size={11} className="text-rose-500 animate-pulse shrink-0" />}
                                                                    {lec.displayToSend.toLocaleString()} pcs
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[8.5px] font-mono font-bold mt-0.5 tracking-tight">
                                                                    <span className="text-purple-400" title={`Full To Send: ${lec.displayFullToSend}`}>F: {lec.displayFullToSend}</span>
                                                                    <span className="text-gray-500/60">•</span>
                                                                    <span className="text-blue-400" title={`Monthly To Send: ${lec.displayMonthlyToSend}`}>M: {lec.displayMonthlyToSend}</span>
                                                                </div>
                                                            </div>

                                                            {/* Floating Hover Card for To Send Breakdown */}
                                                            <div className={`opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-1/2 -translate-x-1/2 z-50 w-72 p-3 rounded-xl bg-gray-900/95 dark:bg-[#131b26]/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl text-left ${idx < 2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                                                                }`}>
                                                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 pb-1.5 mb-2 border-b border-white/10 flex items-center justify-between">
                                                                    <span className="flex items-center gap-1 text-amber-400">
                                                                        <Clock size={12} /> Orders Waiting to Send
                                                                    </span>
                                                                    <span className="text-gray-300 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">Total: {lec.displayToSend} pcs</span>
                                                                </div>
                                                                <div className="space-y-1.5 text-xs">
                                                                    {lec.displayStock < lec.displayToSend && (
                                                                        <div className="flex justify-between items-center p-2 rounded-lg bg-rose-500/20 border border-rose-500/35 text-rose-300">
                                                                            <span className="text-[11px] font-bold flex items-center gap-1.5 text-rose-300">
                                                                                <AlertTriangle size={12} className="text-rose-400 shrink-0 animate-pulse" />
                                                                                Shortage:
                                                                            </span>
                                                                            <span className="font-mono font-black text-rose-200">
                                                                                Needs {lec.displayToSend - lec.displayStock} more pcs
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                                        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                                                            Full Orders To Send:
                                                                        </span>
                                                                        <span className="font-mono font-black text-purple-200">
                                                                            {lec.displayFullToSend.toLocaleString()} pcs
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                                        <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                                            Monthly Orders To Send:
                                                                        </span>
                                                                        <span className="font-mono font-black text-blue-200">
                                                                            {lec.displayMonthlyToSend.toLocaleString()} pcs
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Available Stock with Hover Breakdown */}
                                                        <td className="py-2.5 px-1.5 text-center relative group">
                                                            <div className="inline-flex flex-col items-center justify-center cursor-help">
                                                                <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border flex items-center justify-center gap-1 transition-all ${lec.displayHasHazard
                                                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/35 group-hover:border-rose-500/60 shadow-xs'
                                                                    : lec.displayStock > 20
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/50'
                                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 group-hover:border-amber-500/50'
                                                                    }`}>
                                                                    {lec.displayHasHazard && <AlertTriangle size={11} className="text-rose-500 animate-pulse shrink-0" />}
                                                                    {lec.displayStock.toLocaleString()} pcs
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[8.5px] font-mono font-bold mt-0.5 tracking-tight">
                                                                    <span className="text-purple-400" title={`Full Stock: ${lec.displayFullStock}`}>F: {lec.displayFullStock}</span>
                                                                    <span className="text-gray-500/60">•</span>
                                                                    <span className="text-blue-400" title={`Monthly Stock: ${lec.displayMonthlyStock}`}>M: {lec.displayMonthlyStock}</span>
                                                                </div>
                                                            </div>

                                                            {/* Floating Hover Card for Stock */}
                                                            <div className={`opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-1/2 -translate-x-1/2 z-50 w-72 p-3 rounded-xl bg-gray-900/95 dark:bg-[#131b26]/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl text-left ${idx < 2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                                                                }`}>
                                                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 pb-1.5 mb-2 border-b border-white/10 flex items-center justify-between">
                                                                    <span className="flex items-center gap-1 text-emerald-400">
                                                                        <Package size={12} /> Stock Breakdown
                                                                    </span>
                                                                    <span className="text-gray-300 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">Total: {lec.displayStock} pcs</span>
                                                                </div>
                                                                <div className="space-y-1.5 text-xs">
                                                                    {lec.displayHasHazard && (
                                                                        <div className="flex justify-between items-center p-2 rounded-lg bg-rose-500/20 border border-rose-500/35 text-rose-300">
                                                                            <span className="text-[11px] font-bold flex items-center gap-1.5 text-rose-300">
                                                                                <AlertTriangle size={12} className="text-rose-400 shrink-0 animate-pulse" />
                                                                                Hazard Stock (&lt; 10 pcs):
                                                                            </span>
                                                                            <span className="font-mono font-black text-rose-200">
                                                                                {lec.displayHazardCount} type{lec.displayHazardCount === 1 ? '' : 's'}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                                        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                                                            Full Tutes Stock:
                                                                        </span>
                                                                        <span className="font-mono font-black text-purple-200">
                                                                            {lec.displayFullStock.toLocaleString()} pcs
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                                        <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                                            Monthly Tutes Stock:
                                                                        </span>
                                                                        <span className="font-mono font-black text-blue-200">
                                                                            {lec.displayMonthlyStock.toLocaleString()} pcs
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Actions Column */}
                                                        <td className="py-2.5 px-2 text-right pr-3">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {!isReadOnly && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setTuteFormData({
                                                                                id: null,
                                                                                courseId: getAutoCourseIdForLecturer(lec.name, 'Monthly'),
                                                                                lecturerName: lec.name,
                                                                                paymentGroup: 'Monthly',
                                                                                tuteName: '',
                                                                                itemOrder: (lec.tutes?.length || 0) + 1,
                                                                                imageFile: null,
                                                                                imageFile2: null
                                                                            });
                                                                            setShowTuteModal(true);
                                                                        }}
                                                                        className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white dark:text-blue-400 border border-blue-500/20 transition-all flex items-center gap-1"
                                                                        title={`Add new material for ${lec.name}`}
                                                                    >
                                                                        <Plus size={11} strokeWidth={3} /> Add Tute
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleLecturerExpand(lec.name);
                                                                    }}
                                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-white/10 transition-colors"
                                                                >
                                                                    {isExpanded ? 'Hide' : 'View'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* EXPANDED NESTED MATERIAL BREAKDOWN SUB-TABLE */}
                                                    {isExpanded && (
                                                        <tr className="bg-gray-50/70 dark:bg-black/40 border-y border-gray-200/80 dark:border-white/10">
                                                            <td colSpan={8} className="p-3 pl-6 pr-3">
                                                                <div className="bg-white/95 dark:bg-[#0f141c] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-lg">

                                                                    {/* Sub-table Header Bar */}
                                                                    <div className="px-3.5 py-2 bg-gray-100/80 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 flex flex-wrap justify-between items-center gap-2">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <Package size={14} className="text-brand-accent shrink-0" />
                                                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-800 dark:text-slate-200 truncate">
                                                                                {lec.name} — Material Breakdown ({tutes.length} Types)
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[10px] font-bold">
                                                                            {lec.displayHasHazard && (
                                                                                <span className="px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 font-mono flex items-center gap-1 animate-pulse">
                                                                                    <AlertTriangle size={11} /> {lec.displayHazardCount} Hazard (&lt; 10 pcs)
                                                                                </span>
                                                                            )}
                                                                            <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 font-mono">
                                                                                Delivered: {lec.displayDelivered.toLocaleString()} pcs
                                                                            </span>
                                                                            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                                                                                To Send: {lec.displayToSend.toLocaleString()} pcs
                                                                            </span>
                                                                            <span className={`px-2.5 py-1 rounded-md font-mono border ${lec.displayHasHazard
                                                                                ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/25'
                                                                                : lec.displayStock > 20
                                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                                                }`}>
                                                                                Available Stock: {lec.displayStock.toLocaleString()} pcs
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Nested Sub-table with Balanced Columns */}
                                                                    <table className="w-full text-left border-collapse table-fixed text-xs">
                                                                        <colgroup>
                                                                            <col className="w-[22%]" />  {/* Material / Tute */}
                                                                            <col className="w-[15%]" />  {/* Subject / Course */}
                                                                            <col className="w-[14%]" />  {/* Business & Batch */}
                                                                            <col className="w-[8%]" />   {/* Payment */}
                                                                            <col className="w-[8%]" />   {/* Delivered */}
                                                                            <col className="w-[8%]" />   {/* To Send */}
                                                                            <col className="w-[9%]" />   {/* Available Stock */}
                                                                            <col className="w-[16%]" />  {/* Quick Actions */}
                                                                        </colgroup>
                                                                        <thead>
                                                                            <tr className="border-b border-gray-200 dark:border-white/10 text-[9.5px] uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50/70 dark:bg-white/[0.02]">
                                                                                <th className="py-2 px-3 font-black truncate">Material / Tute</th>
                                                                                <th className="py-2 px-2.5 font-black truncate">Subject / Course</th>
                                                                                <th className="py-2 px-2.5 font-black truncate">Business & Batch</th>
                                                                                <th className="py-2 px-2 font-black text-center">Payment</th>
                                                                                <th className="py-2 px-2 font-black text-center">Delivered</th>
                                                                                <th className="py-2 px-2 font-black text-center">To Send</th>
                                                                                <th className="py-2 px-2 font-black text-center">Available Stock</th>
                                                                                <th className="py-2 px-2.5 font-black text-right pr-3">Quick Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                                            {tutes.map((tute, tIdx) => {
                                                                                const stockQty = tute.availableQuantity ?? 0;
                                                                                const deliveredQty = tute.totalDelivered ?? 0;
                                                                                const isHazard = stockQty < 10;
                                                                                const isLow = stockQty >= 10 && stockQty <= 20;

                                                                                return (
                                                                                    <tr
                                                                                        key={tute.id || tIdx}
                                                                                        className={`transition-colors ${isHazard
                                                                                            ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.07] border-l-2 border-l-rose-500 hover:bg-rose-500/[0.08]'
                                                                                            : tIdx % 2 === 1
                                                                                                ? 'bg-gray-50/40 dark:bg-white/[0.015] hover:bg-brand-accent/[0.04]'
                                                                                                : 'bg-transparent hover:bg-brand-accent/[0.04]'
                                                                                            }`}
                                                                                    >
                                                                                        {/* Material / Tute */}
                                                                                        <td className="py-2 px-3 font-bold text-gray-900 dark:text-slate-100">
                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                <div className="w-7 h-9 rounded bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                                                                                                    <LiveTuteImage stock={tute.rawStock} masterData={masterData} />
                                                                                                </div>
                                                                                                <div className="min-w-0 flex-1">
                                                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                                                        <span className="truncate text-xs font-black" title={tute.tuteName}>{tute.tuteName}</span>
                                                                                                        {isHazard && (
                                                                                                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[8px] font-black uppercase tracking-tight flex items-center gap-0.5 shrink-0 animate-pulse">
                                                                                                                <AlertTriangle size={8} /> &lt; 10
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <span className="text-[9px] font-bold text-gray-400">Order: {tute.itemOrder || 1}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>

                                                                                        {/* Subject / Course */}
                                                                                        <td className="py-2 px-2.5 font-medium text-gray-700 dark:text-slate-300 text-xs truncate" title={tute.courseName}>
                                                                                            {tute.courseName}
                                                                                        </td>

                                                                                        {/* Business & Batch */}
                                                                                        <td className="py-2 px-2.5">
                                                                                            <div className="text-gray-800 dark:text-slate-200 font-bold text-xs truncate" title={tute.businessName}>
                                                                                                {tute.businessName || 'General'}
                                                                                            </div>
                                                                                            {tute.batchName && tute.batchName !== 'N/A' && (
                                                                                                <div className="text-[9.5px] text-gray-400 font-medium truncate" title={tute.batchName}>
                                                                                                    {tute.batchName}
                                                                                                </div>
                                                                                            )}
                                                                                        </td>

                                                                                        {/* Payment */}
                                                                                        <td className="py-2 px-2 text-center">
                                                                                            <span className={`inline-block px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${(tute.paymentType || '').toLowerCase() === 'monthly'
                                                                                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                                                                : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                                                                }`}>
                                                                                                {tute.paymentType || 'General'}
                                                                                            </span>
                                                                                        </td>

                                                                                        {/* Delivered */}
                                                                                        <td className="py-2 px-2 text-center">
                                                                                            <span className="inline-block font-mono font-bold text-xs text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                                                                                {deliveredQty.toLocaleString()} pcs
                                                                                            </span>
                                                                                        </td>

                                                                                        {/* To Send */}
                                                                                        <td className="py-2 px-2 text-center">
                                                                                            <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${(tute.totalToSend ?? 0) > stockQty
                                                                                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/35 font-black'
                                                                                                    : (tute.totalToSend ?? 0) > 0
                                                                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'
                                                                                                }`}
                                                                                                title={`Approved orders waiting to be sent: ${tute.totalToSend || 0} pcs${(tute.totalToSend ?? 0) > stockQty ? ` (Shortage: Needs ${(tute.totalToSend ?? 0) - stockQty} more pcs!)` : ''}`}
                                                                                            >
                                                                                                {(tute.totalToSend || 0).toLocaleString()} pcs
                                                                                            </span>
                                                                                        </td>

                                                                                        {/* Available Stock */}
                                                                                        <td className="py-2 px-2 text-center">
                                                                                            <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border ${isHazard
                                                                                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-xs animate-pulse font-black'
                                                                                                : isLow
                                                                                                    ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/25'
                                                                                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                                                                                }`}>
                                                                                                {isHazard && <AlertTriangle size={11} className="text-rose-500 shrink-0" />}
                                                                                                {stockQty.toLocaleString()} pcs
                                                                                            </span>
                                                                                        </td>

                                                                                        {/* Quick Actions (Qty Input + Add + Adjust + Edit + Del) */}
                                                                                        <td className="py-2 px-2.5 text-right pr-3">
                                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                                {!isReadOnly && (
                                                                                                    <>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            min="1"
                                                                                                            placeholder="Qty"
                                                                                                            value={stockInputs[tute.id] || ''}
                                                                                                            onChange={(e) => setStockInputs({ ...stockInputs, [tute.id]: e.target.value })}
                                                                                                            className="w-14 h-7 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/15 rounded-lg text-gray-900 dark:text-slate-100 text-center text-xs font-black outline-none focus:border-brand-accent shadow-inner"
                                                                                                        />
                                                                                                        <button
                                                                                                            onClick={() => handleAddStock(tute.id)}
                                                                                                            disabled={actionLoading}
                                                                                                            className="h-7 px-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                                                                                                            title="Add Stock Qty"
                                                                                                        >
                                                                                                            <Plus size={11} strokeWidth={3} /> Add
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                setEditData({ id: tute.id, originalIds: tute.originalIds, qty: tute.availableQuantity, reason: '' });
                                                                                                                setShowEditModal(true);
                                                                                                            }}
                                                                                                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                                                                                            title="Adjust Balance"
                                                                                                        >
                                                                                                            <Box size={13} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                setTuteFormData({ id: tute.id, courseId: tute.courseId, lecturerName: lec.name, paymentGroup: tute.paymentType, tuteName: tute.tuteName, itemOrder: tute.itemOrder || 1, imageFile: null, imageFile2: null });
                                                                                                                setShowTuteModal(true);
                                                                                                            }}
                                                                                                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20"
                                                                                                            title="Edit Details"
                                                                                                        >
                                                                                                            <Edit2 size={13} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => handleDeleteStock(tute.id)}
                                                                                                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                                                                                                            title="Delete Material"
                                                                                                        >
                                                                                                            <Trash2 size={13} />
                                                                                                        </button>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* ================= VIEW 2: ALL MATERIALS FLAT TABLE ================= */
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02] sticky top-0 z-20 backdrop-blur-md">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                        Showing {allTableMaterials.length} Materials
                                    </span>
                                </div>

                                <table className="w-full text-left border-collapse table-fixed text-xs">
                                    <colgroup>
                                        <col className="w-[20%]" />  {/* Material / Tute */}
                                        <col className="w-[14%]" />  {/* Lecturer */}
                                        <col className="w-[14%]" />  {/* Subject / Course */}
                                        <col className="w-[12%]" />  {/* Business & Batch */}
                                        <col className="w-[7%]" />   {/* Payment */}
                                        <col className="w-[8%]" />   {/* Delivered */}
                                        <col className="w-[8%]" />   {/* To Send */}
                                        <col className="w-[8%]" />   {/* Stock */}
                                        <col className="w-[16%]" />  {/* Actions */}
                                    </colgroup>
                                    <thead className="bg-gray-100/90 dark:bg-black/60 backdrop-blur-md sticky top-[37px] border-b border-gray-200 dark:border-white/10 z-10">
                                        <tr className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            <th className="py-2.5 px-3 font-black cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('name')}>
                                                <div className="flex items-center gap-1 truncate">
                                                    Material / Tute <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-2 font-black truncate">Lecturer</th>
                                            <th className="py-2.5 px-2 font-black truncate">Subject / Course</th>
                                            <th className="py-2.5 px-2 font-black truncate">Business & Batch</th>
                                            <th className="py-2.5 px-1.5 font-black text-center">Payment</th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('totalDelivered')}>
                                                <div className="flex items-center justify-center gap-1 truncate">
                                                    Delivered <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('totalToSend')}>
                                                <div className="flex items-center justify-center gap-1 truncate" title="Orders to Send">
                                                    To Send <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-1.5 font-black text-center cursor-pointer hover:text-brand-accent transition-colors" onClick={() => handleSort('totalStock')}>
                                                <div className="flex items-center justify-center gap-1 truncate">
                                                    Stock <ArrowUpDown size={11} className="opacity-50 shrink-0" />
                                                </div>
                                            </th>
                                            <th className="py-2.5 px-2.5 text-right pr-3 font-black truncate">Quick Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {allTableMaterials.map((tute, mIdx) => {
                                            const stockQty = tute.availableQuantity ?? 0;
                                            const deliveredQty = tute.totalDelivered ?? 0;
                                            const isHazard = stockQty < 10;
                                            const isLow = stockQty >= 10 && stockQty <= 20;

                                            return (
                                                <tr
                                                    key={tute.id || mIdx}
                                                    className={`transition-colors ${isHazard
                                                        ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.07] border-l-2 border-l-rose-500 hover:bg-rose-500/[0.08]'
                                                        : mIdx % 2 === 1
                                                            ? 'bg-gray-50/40 dark:bg-white/[0.015] hover:bg-brand-accent/[0.04]'
                                                            : 'bg-transparent hover:bg-brand-accent/[0.04]'
                                                        }`}
                                                >
                                                    {/* Material / Tute */}
                                                    <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-slate-100">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-7 h-9 rounded bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                                                                <LiveTuteImage stock={tute.rawStock} masterData={masterData} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="truncate text-xs font-black" title={tute.tuteName}>{tute.tuteName}</span>
                                                                    {isHazard && (
                                                                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[8px] font-black uppercase tracking-tight flex items-center gap-0.5 shrink-0 animate-pulse">
                                                                            <AlertTriangle size={8} /> &lt; 10
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[9px] font-bold text-gray-400">Order: {tute.itemOrder || 1}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Lecturer */}
                                                    <td className="py-2.5 px-2">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <SmartLecturerAvatar image={tute.lecturerImage} name={tute.lecturerName} size="w-5 h-5" textSize="text-[8px]" />
                                                            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate" title={tute.lecturerName}>
                                                                {tute.lecturerName}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Subject / Course */}
                                                    <td className="py-2.5 px-2 font-medium text-gray-700 dark:text-slate-300 text-xs truncate" title={tute.courseName}>
                                                        {tute.courseName}
                                                    </td>

                                                    {/* Business & Batch */}
                                                    <td className="py-2.5 px-2">
                                                        <div className="text-gray-800 dark:text-slate-200 font-bold text-xs truncate" title={tute.businessName}>
                                                            {tute.businessName || 'General'}
                                                        </div>
                                                        {tute.batchName && tute.batchName !== 'N/A' && (
                                                            <div className="text-[9.5px] text-gray-400 font-medium truncate" title={tute.batchName}>
                                                                {tute.batchName}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Payment */}
                                                    <td className="py-2.5 px-1.5 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${(tute.paymentType || '').toLowerCase() === 'monthly'
                                                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                            }`}>
                                                            {tute.paymentType || 'General'}
                                                        </span>
                                                    </td>

                                                    {/* Delivered */}
                                                    <td className="py-2.5 px-1.5 text-center">
                                                        <span className="inline-block font-mono font-bold text-xs text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                                            {deliveredQty.toLocaleString()} pcs
                                                        </span>
                                                    </td>

                                                    {/* To Send */}
                                                    <td className="py-2.5 px-1.5 text-center">
                                                        <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${(tute.totalToSend ?? 0) > stockQty
                                                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/35 font-black'
                                                                : (tute.totalToSend ?? 0) > 0
                                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'
                                                            }`}
                                                            title={`Approved orders waiting to be sent: ${tute.totalToSend || 0} pcs${(tute.totalToSend ?? 0) > stockQty ? ` (Shortage: Needs ${(tute.totalToSend ?? 0) - stockQty} more pcs!)` : ''}`}
                                                        >
                                                            {(tute.totalToSend || 0).toLocaleString()} pcs
                                                        </span>
                                                    </td>

                                                    {/* Available Stock */}
                                                    <td className="py-2.5 px-1.5 text-center">
                                                        <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${isHazard
                                                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-xs animate-pulse font-black'
                                                            : isLow
                                                                ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/25'
                                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                                            }`}>
                                                            {isHazard && <AlertTriangle size={11} className="text-rose-500 shrink-0" />}
                                                            {stockQty.toLocaleString()} pcs
                                                        </span>
                                                    </td>

                                                    {/* Quick Actions */}
                                                    <td className="py-2.5 px-2.5 text-right pr-3">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {!isReadOnly && (
                                                                <>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        placeholder="Qty"
                                                                        value={stockInputs[tute.id] || ''}
                                                                        onChange={(e) => setStockInputs({ ...stockInputs, [tute.id]: e.target.value })}
                                                                        className="w-14 h-7 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/15 rounded-lg text-gray-900 dark:text-slate-100 text-center text-xs font-black outline-none focus:border-brand-accent shadow-inner"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleAddStock(tute.id)}
                                                                        disabled={actionLoading}
                                                                        className="h-7 px-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                                                                        title="Add Stock Qty"
                                                                    >
                                                                        <Plus size={11} strokeWidth={3} /> Add
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditData({ id: tute.id, originalIds: tute.originalIds, qty: tute.availableQuantity, reason: '' });
                                                                            setShowEditModal(true);
                                                                        }}
                                                                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                                                        title="Adjust Balance"
                                                                    >
                                                                        <Box size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setTuteFormData({ id: tute.id, courseId: tute.courseId, lecturerName: tute.lecturerName, paymentGroup: tute.paymentType, tuteName: tute.tuteName, itemOrder: tute.itemOrder || 1, imageFile: null, imageFile2: null });
                                                                            setShowTuteModal(true);
                                                                        }}
                                                                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20"
                                                                        title="Edit Details"
                                                                    >
                                                                        <Edit2 size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStock(tute.id)}
                                                                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                                                                        title="Delete Material"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* TILE VIEW (Grid & Card Drill-Down: Level 1 -> Level 2 -> Level 3)         */
                /* ========================================================================= */
                <div className="flex-1 flex flex-col min-h-0">
                    <Breadcrumbs />

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* LEVEL 1: LECTURERS */}
                            {viewLevel === 1 && (
                                <>
                                    {filteredLecturers.length === 0 ? (
                                        <div className="text-center py-20 text-gray-500 dark:text-slate-400"><Users size={40} className="mx-auto mb-3 opacity-50" />No lecturers found.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {filteredLecturers.map((lec, idx) => (
                                                <div key={idx} className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[1.5rem] p-6 cursor-pointer group transition-all shadow-sm hover:shadow-lg hover:border-brand-accent/50 flex flex-col items-center text-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="absolute top-2 right-2 flex gap-1 z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); setLecFormData({ oldName: lec.name, newName: lec.name, imageFile: null }); setShowLecModal(true); }} className="p-1.5 bg-gray-200/50 hover:bg-amber-500/20 text-amber-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                        {!isReadOnly && <button onClick={(e) => { e.stopPropagation(); handleDeleteLecturer(lec.name); }} className="p-1.5 bg-gray-200/50 hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                                                    </div>
                                                    <div onClick={() => handleLecturerClick(lec.name)} className="flex flex-col items-center w-full z-10">
                                                        <LecturerImage image={lec.image} name={lec.name} />
                                                        <h3 className="font-black text-lg text-gray-900 dark:text-slate-100 mb-1 line-clamp-1" title={lec.name}>
                                                            {lec.name.split(' ').length > 3 ? lec.name.split(' ').slice(0, 3).join(' ') + '...' : lec.name}
                                                        </h3>
                                                        {lec.businesses.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 justify-center mt-1 mb-2">
                                                                {lec.businesses.map((b, i) => <span key={i} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full">{b}</span>)}
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg mt-2">View Lecturer Details</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* LEVEL 2: PAYMENT TYPES */}
                            {viewLevel === 2 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto mt-6">
                                    {paymentGroups.length === 0 ? (
                                        <div className="col-span-1 sm:col-span-2 text-center py-20 text-gray-500 dark:text-slate-400"><CreditCard size={40} className="mx-auto mb-3 opacity-50" />No payment groups found for this lecturer.</div>
                                    ) : paymentGroups.map(pg => {
                                        const isMonthly = pg === 'Monthly';
                                        return (
                                            <div key={pg} onClick={() => handlePaymentGroupClick(pg)} className={`bg-white/80 dark:bg-white/[0.02] backdrop-blur-2xl border ${isMonthly ? 'border-blue-200 dark:border-blue-500/20 hover:border-blue-500/50' : 'border-purple-200 dark:border-purple-500/20 hover:border-purple-500/50'} rounded-[2rem] p-10 cursor-pointer group transition-all shadow-md hover:shadow-2xl text-center relative overflow-hidden`}>
                                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-8 -mt-8 opacity-10 transition-transform group-hover:scale-125 ${isMonthly ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 border shadow-lg relative z-10 transition-transform group-hover:-translate-y-2 duration-300 ${isMonthly ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white border-blue-600/50' : 'bg-gradient-to-br from-purple-400 to-purple-600 text-white border-purple-600/50'}`}>
                                                    <CreditCard size={36} />
                                                </div>
                                                <h3 className="font-black text-3xl text-gray-900 dark:text-slate-100 mb-3 relative z-10">{pg}</h3>
                                                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 relative z-10">Manage tute stock for {pg} students</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* LEVEL 3: STOCKS */}
                            {viewLevel === 3 && (
                                <>
                                    {finalStocks.length === 0 ? (
                                        <div className="text-center py-24 bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl rounded-[2rem] border border-gray-200 dark:border-white/5 transition-colors shadow-sm">
                                            <FileText size={40} className="text-gray-400 dark:text-slate-600 mx-auto mb-4 transition-colors opacity-50" />
                                            <p className="text-gray-500 dark:text-slate-400 text-base font-bold transition-colors">No stock items found for this selection.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                            {finalStocks.map(stock => {
                                                const isLow = stock.availableQuantity <= 10;
                                                const paymentGroup = selectedPaymentGroup;
                                                const paymentColor = paymentGroup === 'Monthly' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' : 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30';

                                                return (
                                                    <div key={stock.id} className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-2xl hover:bg-white dark:hover:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-[1.5rem] p-5 flex flex-col md:flex-row items-center justify-between gap-5 transition-all group shadow-sm hover:shadow-lg overflow-hidden">

                                                        {/* Left: Tute Info */}
                                                        <div className="flex items-center gap-5 flex-1 min-w-0 w-full transition-colors">
                                                            <div className="flex -space-x-8 hover:space-x-2 transition-all">
                                                                <div className="w-16 h-24 bg-gray-100 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative z-10">
                                                                    <LiveTuteImage stock={stock} masterData={masterData} />
                                                                </div>
                                                                {stock.tuteImage2 && stock.tuteImage2 !== 'null' && (
                                                                    <div className="w-16 h-24 bg-gray-100 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative z-0">
                                                                        <img src={`${axios.defaults.baseURL.replace('/api', '')}/storage/documents/${stock.tuteImage2}`} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col justify-center min-w-0 flex-1 transition-colors">
                                                                <div className="flex flex-wrap items-center gap-2.5 mb-1.5 min-w-0">
                                                                    <h4 className="font-black text-gray-900 dark:text-slate-100 text-base truncate" title={stock.course?.name}>{stock.course?.name || "Extra Material"}</h4>
                                                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest whitespace-nowrap border shrink-0 transition-colors shadow-sm ${paymentColor}`}>
                                                                        {paymentGroup}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mt-0.5 truncate transition-colors">{stock.tuteName} <span className="ml-2 text-[10px] font-black bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">Order: {stock.itemOrder || 1}</span></p>
                                                                <div className="mt-3 flex items-center gap-2 transition-colors">
                                                                    <span className={`px-3 py-1 rounded-lg text-xs font-black border uppercase tracking-widest shadow-sm transition-colors ${isLow ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>
                                                                        Stock: {stock.availableQuantity}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Actions */}
                                                        <div className="flex items-center gap-2.5 shrink-0 bg-white dark:bg-black/30 backdrop-blur-md p-2 rounded-2xl border border-gray-100 dark:border-white/5 w-full md:w-auto justify-between md:justify-start transition-colors shadow-sm">
                                                            <div className="flex items-center rounded-lg px-1 flex-1 sm:flex-none transition-colors">
                                                                <input
                                                                    type="number" min="1" placeholder="Qty"
                                                                    value={stockInputs[stock.id] || ''}
                                                                    onChange={(e) => setStockInputs({ ...stockInputs, [stock.id]: e.target.value })}
                                                                    className="w-16 h-10 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-slate-200 text-center text-sm font-black focus:border-brand-accent dark:focus:border-brand-accent outline-none transition-colors placeholder:text-gray-400 dark:placeholder-slate-500 shadow-inner"
                                                                />
                                                            </div>

                                                            {!isReadOnly && (
                                                                <>
                                                                    <button onClick={() => handleAddStock(stock.id)} disabled={actionLoading} className="h-10 bg-brand-accent hover:bg-brand-accentHover text-white px-5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-md hover:scale-105 active:scale-95 transition-transform">
                                                                        <Plus size={14} strokeWidth={3} /> Add
                                                                    </button>

                                                                    <button onClick={() => { setEditData({ id: stock.id, originalIds: stock.originalIds, qty: stock.availableQuantity, reason: '' }); setShowEditModal(true); }} className="h-10 w-10 flex items-center justify-center text-gray-400 dark:text-slate-400 hover:text-brand-accent dark:hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10" title="Adjust Balance">
                                                                        <Box size={16} />
                                                                    </button>
                                                                    <button onClick={() => { setTuteFormData({ id: stock.id, courseId: stock.courseId, lecturerName: selectedLecturer, paymentGroup: selectedPaymentGroup, tuteName: stock.tuteName, itemOrder: stock.itemOrder || 1, imageFile: null, imageFile2: null }); setShowTuteModal(true); }} className="h-10 w-10 flex items-center justify-center text-gray-400 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20" title="Edit Details">
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteStock(stock.id)} className="h-10 w-10 flex items-center justify-center text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20" title="Delete Material">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODALS                                                                    */}
            {/* ========================================================================= */}

            {/* ADVANCED REPORT MODAL */}
            {showReportModal && createPortal(
                <div className="fixed inset-0 z-[99] bg-gray-900/60 dark:bg-[#0a0f1c]/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in transition-colors">
                    <div className="bg-white dark:bg-[#15192b] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 transition-colors">

                        <div className="flex justify-between items-center mb-6 pb-5 border-b border-gray-200 dark:border-white/10 shrink-0 transition-colors">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-slate-100 flex items-center gap-3 transition-colors">
                                <BarChart3 size={28} className="text-brand-accent transition-colors" /> Advanced Delivery & Stock Report
                            </h3>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-white/5 p-2.5 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <div className="bg-white/80 dark:bg-black/30 p-6 rounded-[1.5rem] border border-gray-200 dark:border-white/10 mb-6 shrink-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 transition-colors shadow-sm backdrop-blur-md">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block uppercase tracking-widest transition-colors">Time Period</label>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setMonthDates('this_month')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${reportFilters.dateType === 'this_month' ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>This Month</button>
                                    <button onClick={() => setMonthDates('last_month')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${reportFilters.dateType === 'last_month' ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>Last Month</button>
                                    <button onClick={() => setReportFilters({ ...reportFilters, dateType: 'custom' })} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${reportFilters.dateType === 'custom' ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>Custom</button>
                                </div>
                                {reportFilters.dateType === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })} className="flex-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 outline-none focus:border-brand-accent dark:focus:border-brand-accent [color-scheme:light] dark:[color-scheme:dark] transition-colors shadow-inner" />
                                        <span className="text-gray-400 dark:text-slate-500 font-black transition-colors">-</span>
                                        <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })} className="flex-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 outline-none focus:border-brand-accent dark:focus:border-brand-accent [color-scheme:light] dark:[color-scheme:dark] transition-colors shadow-inner" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 block uppercase tracking-widest transition-colors">Payment Type</label>
                                <select value={reportFilters.paymentType} onChange={e => setReportFilters({ ...reportFilters, paymentType: e.target.value })} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-slate-200 outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors shadow-inner">
                                    <option value="">All Types</option>
                                    <option value="Full">Full Payment</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Installment">Installment</option>
                                </select>
                            </div>
                            <div className="md:col-span-4 flex justify-end gap-3 mt-3 border-t border-gray-200 dark:border-white/10 pt-5 transition-colors">
                                <button onClick={exportReportCSV} disabled={reportData.length === 0} className="bg-white/80 dark:bg-white/5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                                    <Download size={16} /> Export CSV
                                </button>
                                <button onClick={generateReport} disabled={reportLoading} className="bg-brand-accent hover:bg-brand-accentHover text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center gap-2 shadow-lg shadow-brand-accent/30">
                                    {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />} Generate Report
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 relative transition-colors shadow-inner">
                            {reportLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-brand-accent transition-colors" /></div>
                            ) : reportData.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 transition-colors">
                                    <FileText size={48} className="mb-4 opacity-40" />
                                    <p className="text-base font-bold">Select filters and generate report.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/90 dark:bg-black/40 backdrop-blur-md sticky top-0 border-b border-gray-200 dark:border-white/10 z-10 transition-colors">
                                        <tr className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400">
                                            <th className="p-5 font-black">Business / Batch</th>
                                            <th className="p-5 font-black">Subject & Payment Grp</th>
                                            <th className="p-5 font-black">Material Name</th>
                                            <th className="p-5 font-black text-center">Total Delivered</th>
                                            <th className="p-5 font-black text-center">Remaining Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 transition-colors">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-white/60 dark:hover:bg-white/[0.05] transition-colors">
                                                <td className="p-5 transition-colors">
                                                    <p className="font-black text-gray-900 dark:text-slate-200 text-sm transition-colors">{row.businessName}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-500 mt-1 transition-colors">{row.batchName}</p>
                                                </td>
                                                <td className="p-5 transition-colors">
                                                    <p className="font-bold text-gray-700 dark:text-slate-300 text-sm transition-colors mb-1.5">{row.courseName}</p>
                                                    <span className={`inline-block px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm ${row.paymentType === 'Monthly' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'}`}>{row.paymentType}</span>
                                                </td>
                                                <td className="p-5 text-sm font-bold text-gray-600 dark:text-slate-400 transition-colors">{row.tuteName}</td>
                                                <td className="p-5 text-center border-l border-r border-gray-100 dark:border-white/5 transition-colors">
                                                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 transition-colors shadow-sm">{row.deliveredQty}</span>
                                                </td>
                                                <td className="p-5 text-center transition-colors">
                                                    <span className={`text-base font-black px-4 py-1.5 rounded-lg border transition-colors shadow-sm ${row.currentStock <= 10 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-black/40 border-gray-200 dark:border-white/10'}`}>
                                                        {row.currentStock}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* ADJUST STOCK MODAL */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 z-[99] bg-gray-900/60 dark:bg-[#0a0f1c]/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in transition-colors">
                    <div className="bg-white dark:bg-[#15192b] border border-gray-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 transition-colors">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                            <h3 className="text-xl font-black text-gray-900 dark:text-slate-100 flex items-center gap-3 transition-colors"><Edit3 size={24} className="text-brand-accent" /> Adjust Stock</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 bg-gray-100 dark:bg-white/5 p-2.5 rounded-xl transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditStockSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-slate-400 mb-2 block uppercase tracking-widest transition-colors">New Total Quantity <span className="text-red-500">*</span></label>
                                <input type="number" required min="0" value={editData.qty} onChange={e => setEditData({ ...editData, qty: e.target.value })} className="w-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl p-4 text-gray-900 dark:text-slate-200 text-2xl font-black text-center outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors shadow-inner" />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-slate-400 mb-2 block uppercase tracking-widest transition-colors">Reason for change <span className="text-red-500">*</span></label>
                                <input type="text" required placeholder="e.g. Recounted, Damaged, Re-stocked" value={editData.reason} onChange={e => setEditData({ ...editData, reason: e.target.value })} className="w-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm font-bold text-gray-900 dark:text-slate-200 outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors shadow-inner placeholder-gray-400 dark:placeholder-slate-600" />
                            </div>
                            <button type="submit" disabled={actionLoading} className="w-full bg-brand-accent hover:bg-brand-accentHover text-white rounded-xl py-4 font-black uppercase tracking-widest transition-colors mt-4 disabled:opacity-50 text-xs shadow-lg shadow-brand-accent/30 active:scale-95 transition-transform flex justify-center items-center gap-2">
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Update Balance
                            </button>
                        </form>
                    </div>
                </div>, document.body
            )}

            {/* TUTE CREATE / EDIT MODAL */}
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
                                {tuteFormData.lecturerName && (
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-slate-300">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">Lecturer</span>
                                        {tuteFormData.lecturerName}
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Payment Group</label>
                                    <select
                                        value={tuteFormData.paymentGroup || 'Monthly'}
                                        onChange={e => setTuteFormData(p => ({ ...p, paymentGroup: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Full Payment">Full Payment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tute Name *</label>
                                    <input type="text" required value={tuteFormData.tuteName} onChange={e => setTuteFormData(p => ({ ...p, tuteName: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200" placeholder="e.g. Tute 01 - Theory" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Item Order (Sorting)</label>
                                    <input type="number" required value={tuteFormData.itemOrder} onChange={e => setTuteFormData(p => ({ ...p, itemOrder: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tute Cover Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setTuteFormData(p => ({ ...p, imageFile: e.target.files[0] }))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tute Back Image / 2nd Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setTuteFormData(p => ({ ...p, imageFile2: e.target.files[0] }))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20" />
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

            {/* LECTURER EDIT / CREATE MODAL */}
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
                                    <input type="text" required value={lecFormData.newName} onChange={e => setLecFormData(p => ({ ...p, newName: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Profile Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setLecFormData(p => ({ ...p, imageFile: e.target.files[0] }))} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-accent transition-colors text-slate-800 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20" />
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

        </div>
    );
}
