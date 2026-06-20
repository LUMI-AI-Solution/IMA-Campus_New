import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Loader2, TrendingUp, Save, CreditCard, Gift, Info, BookOpen, Percent, CheckSquare, Square, Calendar, Plus, Trash2, Image as ImageIcon, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

const UpgradePricingConfig = ({ activeBatch, uniqueSubjects }) => {
    const [pricingValues, setPricingValues] = useState({
        subjects: {}
    });

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [showUpgradeOffer, setShowUpgradeOffer] = useState(true);
    const [toggling, setToggling] = useState(false);

    // Advanced Rich Config States (Professional English-Only)
    const [enableBundle, setEnableBundle] = useState(false);
    const [bundleSubjects, setBundleSubjects] = useState([]);
    const [bundle2Price, setBundle2Price] = useState(0);
    const [bundle3Price, setBundle3Price] = useState(0);

    const [enableInstallments, setEnableInstallments] = useState(false);
    const [installmentSubjects, setInstallmentSubjects] = useState([]);
    const [installments1, setInstallments1] = useState([]);
    const [installments2, setInstallments2] = useState([]);
    const [installments3, setInstallments3] = useState([]);

    const [bannerImage, setBannerImage] = useState('');
    const [postsList, setPostsList] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    const getAverageSubjectPrice = () => {
        if (!uniqueSubjects || uniqueSubjects.length === 0) return 34500;
        const keys = Object.keys(pricingValues.subjects);
        if (keys.length === 0) {
            const sum = uniqueSubjects.reduce((s, sub) => s + (sub.price || 34500), 0);
            return sum / uniqueSubjects.length;
        }
        const sum = keys.reduce((s, id) => s + (pricingValues.subjects[id]?.full || 0), 0);
        return sum / keys.length;
    };

    useEffect(() => {
        const fetchToggleStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const bizQuery = activeBatch?.businessId ? `?businessId=${activeBatch.businessId}` : '';
                const res = await axios.get(`/upgrade-pricing/toggle-status${bizQuery}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    setShowUpgradeOffer(res.data.showUpgradeOffer);
                }
            } catch (e) {
                console.error("Error fetching toggle status:", e);
            }
        };
        fetchToggleStatus();
    }, [activeBatch?.businessId]);

    const handleToggleOffer = async () => {
        try {
            setToggling(true);
            const token = localStorage.getItem('token');
            const nextVal = !showUpgradeOffer;
            await axios.post('/upgrade-pricing/toggle-status', {
                showUpgradeOffer: nextVal,
                businessId: activeBatch?.businessId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowUpgradeOffer(nextVal);
            toast.success(nextVal ? "Upgrade offer enabled for this business!" : "Upgrade offer disabled for this business!");
        } catch (e) {
            toast.error("Failed to update upgrade offer visibility setting.");
        } finally {
            setToggling(false);
        }
    };

    // Initialize values and fetch configs
    useEffect(() => {
        if (!activeBatch || !uniqueSubjects) return;

        const fetchBatchPrices = async () => {
            try {
                setFetching(true);
                const token = localStorage.getItem('token');
                
                // Initialize default prices based on uniqueSubjects
                const initialSubjects = {};
                uniqueSubjects.forEach(sub => {
                    initialSubjects[sub.id] = {
                        full: sub.price || 34500
                    };
                });

                const res = await axios.get(`/upgrade-pricing/admin/prices?batchId=${activeBatch.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const loadedValues = {
                    subjects: { ...initialSubjects }
                };

                const avgPrice = uniqueSubjects.reduce((s, sub) => s + (sub.price || 34500), 0) / uniqueSubjects.length;

                if (res.data) {
                    const { prices, richConfig } = res.data;

                    if (prices && Array.isArray(prices)) {
                        prices.forEach(p => {
                            if (p.planType === 'FULL' && p.courseId) {
                                loadedValues.subjects[p.courseId] = { full: p.amount };
                            }
                        });
                    }

                    if (richConfig) {
                        setEnableBundle(!!richConfig.enableBundle);
                        setBundleSubjects(richConfig.bundleSubjects || []);
                        setBundle2Price(richConfig.bundle2Price || 0);
                        setBundle3Price(richConfig.bundle3Price || 0);

                        setEnableInstallments(!!richConfig.enableInstallments);
                        setInstallmentSubjects(richConfig.installmentSubjects || []);
                        setInstallments1(richConfig.installments1 || []);
                        setInstallments2(richConfig.installments2 || []);
                        setInstallments3(richConfig.installments3 || []);
                        setBannerImage(richConfig.bannerImage || '');
                    } else {
                        // Fallback defaults
                        setEnableBundle(false);
                        setBundleSubjects(uniqueSubjects.map(s => s.id));
                        setBundle2Price(Math.round(avgPrice * 2 * 0.9));
                        setBundle3Price(Math.round(avgPrice * 3 * 0.85));

                        setEnableInstallments(false);
                        setInstallmentSubjects(uniqueSubjects.map(s => s.id));
                        setInstallments1([
                            { amount: Math.round(avgPrice * 0.55), days: 0 },
                            { amount: Math.round(avgPrice * 0.45), days: 30 }
                        ]);
                        setInstallments2([
                            { amount: Math.round(avgPrice * 2 * 0.55), days: 0 },
                            { amount: Math.round(avgPrice * 2 * 0.45), days: 30 }
                        ]);
                        setInstallments3([
                            { amount: Math.round(avgPrice * 3 * 0.4), days: 0 },
                            { amount: Math.round(avgPrice * 3 * 0.3), days: 30 },
                            { amount: Math.round(avgPrice * 3 * 0.3), days: 30 }
                        ]);
                        setBannerImage('');
                    }
                }

                // Fetch Content Hub announcements for banner selection
                try {
                    setLoadingPosts(true);
                    const postsRes = await axios.get('/admin/manager/posts', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (postsRes.data) {
                        setPostsList(postsRes.data);
                    }
                } catch (e) {
                    console.error("Error fetching announcements:", e);
                } finally {
                    setLoadingPosts(false);
                }

                setPricingValues(loadedValues);
            } catch (error) {
                console.error("Error fetching upgrade prices:", error);
                toast.error("Failed to load existing upgrade pricing configurations.");
            } finally {
                setFetching(false);
            }
        };

        fetchBatchPrices();
    }, [activeBatch, uniqueSubjects]);

    const handleSubjectPriceChange = (courseId, val) => {
        const parsedVal = parseFloat(val);
        setPricingValues(prev => ({
            ...prev,
            subjects: {
                ...prev.subjects,
                [courseId]: {
                    full: isNaN(parsedVal) ? 0 : parsedVal
                }
            }
        }));
    };

    const toggleBundleSubject = (id) => {
        setBundleSubjects(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleInstallmentSubject = (id) => {
        setInstallmentSubjects(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Installment Array Actions (Add, Edit, Delete)
    const handleInstallmentEdit = (plan, index, field, val) => {
        if (plan === 1) {
            const updated = [...installments1];
            updated[index][field] = field === 'amount' || field === 'days' ? (parseFloat(val) || 0) : val;
            setInstallments1(updated);
        } else if (plan === 2) {
            const updated = [...installments2];
            updated[index][field] = field === 'amount' || field === 'days' ? (parseFloat(val) || 0) : val;
            setInstallments2(updated);
        } else {
            const updated = [...installments3];
            updated[index][field] = field === 'amount' || field === 'days' ? (parseFloat(val) || 0) : val;
            setInstallments3(updated);
        }
    };

    const addInstallmentStep = (plan) => {
        if (plan === 1) {
            setInstallments1([...installments1, { amount: 0, days: 30 }]);
        } else if (plan === 2) {
            setInstallments2([...installments2, { amount: 0, days: 30 }]);
        } else {
            setInstallments3([...installments3, { amount: 0, days: 30 }]);
        }
    };

    const deleteInstallmentStep = (plan, index) => {
        if (plan === 1) {
            setInstallments1(installments1.filter((_, i) => i !== index));
        } else if (plan === 2) {
            setInstallments2(installments2.filter((_, i) => i !== index));
        } else {
            setInstallments3(installments3.filter((_, i) => i !== index));
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('banner', file);

        try {
            setUploadingBanner(true);
            const token = localStorage.getItem('token');
            const res = await axios.post('/upgrade-pricing/admin/upload-banner', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (res.data && res.data.filename) {
                setBannerImage(res.data.filename);
                toast.success("Upgrade banner image uploaded successfully!");
            }
        } catch (error) {
            console.error("Banner upload error:", error);
            toast.error(error.response?.data?.error || "Failed to upload banner image.");
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        if (!activeBatch) return;
        setLoading(true);

        const configs = [];
        const avg = getAverageSubjectPrice();

        // 1. Build subject targets configurations
        Object.keys(pricingValues.subjects).forEach(courseIdStr => {
            const courseId = parseInt(courseIdStr);
            const amt = parseFloat(pricingValues.subjects[courseId]?.full) || 0;
            configs.push({
                courseId,
                planType: 'FULL',
                amount: amt
            });
        });

        // 2. Save bundle discounts database targets (fallback calculations)
        if (enableBundle) {
            configs.push({
                planType: 'BUNDLE_DISCOUNT',
                subjectCount: 2,
                amount: Math.max(0, avg * 2 - bundle2Price)
            });
            configs.push({
                planType: 'BUNDLE_DISCOUNT',
                subjectCount: 3,
                amount: Math.max(0, avg * 3 - bundle3Price)
            });
        }

        const richConfig = {
            enableBundle,
            bundleSubjects,
            bundle2Price,
            bundle3Price,
            enableInstallments,
            installmentSubjects,
            installments1,
            installments2,
            installments3,
            bannerImage
        };

        try {
            const token = localStorage.getItem('token');
            await axios.post('/upgrade-pricing/admin/set-prices', {
                batchId: activeBatch.id,
                pricingConfigs: configs,
                richConfig
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Upgrade pricing configurations updated successfully!");
        } catch (error) {
            console.error("Error saving upgrade prices:", error);
            toast.error("Failed to save configurations to database.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (num) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/10 rounded-[2rem] shadow-xl min-h-[350px] backdrop-blur-md">
                <Loader2 size={36} className="animate-spin text-[#9d4edd] mb-4" />
                <p className="text-gray-400 text-sm font-semibold tracking-wide">Loading upgrade configurations...</p>
            </div>
        );
    }

    if (!uniqueSubjects || uniqueSubjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/10 rounded-[2rem] shadow-xl min-h-[300px] backdrop-blur-md">
                <Info size={36} className="text-gray-500 mb-4" />
                <p className="text-gray-400 text-sm font-semibold tracking-wide text-center">
                    No subjects found in this batch. Please configure batch subjects first.
                </p>
            </div>
        );
    }

    const avgPrice = getAverageSubjectPrice();

    return (
        <div className="space-y-8 relative z-10 w-full text-white">
            
            {/* 1. Global Visibility Toggle Panel */}
            <div className="bg-[#121124] border-2 border-white/10 p-6 rounded-[2rem] shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                        <TrendingUp size={22} />
                    </span>
                    <div>
                        <h4 className="text-md font-black text-white uppercase tracking-wider">Dashboard Special Offer Visibility</h4>
                        <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                            Control whether the Upgrade Offer Widget appears on the student's dashboard.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleToggleOffer}
                    disabled={toggling}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all scale-[0.98] active:scale-95 border ${
                        showUpgradeOffer 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:bg-red-500/20'
                    }`}
                >
                    {toggling ? 'Updating...' : showUpgradeOffer ? 'ACTIVE / VISIBLE' : 'INACTIVE / HIDDEN'}
                </button>
            </div>

            {/* 1.5. Special Widget Banner Image Configuration Panel */}
            <div className="bg-[#121124] border-2 border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <span className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                        <ImageIcon size={20} />
                    </span>
                    <div>
                        <h3 className="text-md font-black text-white uppercase tracking-wider">Configure Widget Banner Image</h3>
                        <p className="text-xs text-gray-400 font-semibold leading-relaxed mt-0.5">
                            Upload a custom promo banner or select from existing Content Hub announcements to display in the student widget.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                    {/* Left: Upload and Selection Control */}
                    <div className="space-y-6">
                        {/* Option A: Direct Upload */}
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Option A: Upload Custom Banner File</label>
                            <div className="flex items-center gap-4">
                                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/15 bg-black/35 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all p-5 rounded-2xl cursor-pointer text-center group">
                                    <UploadCloud size={28} className="text-gray-400 group-hover:text-amber-400 transition-colors mb-2" />
                                    <span className="text-xs font-bold text-white mb-1">Click to upload file</span>
                                    <span className="text-[9px] text-gray-500">PNG, JPG, WEBP (Max 5MB)</span>
                                    <input type="file" onChange={handleBannerUpload} accept="image/*" className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Option B: Choose from Content Hub */}
                        <div className="space-y-3">
                            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Option B: Select from Content Hub Announcements</label>
                            {loadingPosts ? (
                                <div className="flex items-center gap-2 text-xs text-gray-500 py-3 italic">
                                    <Loader2 size={12} className="animate-spin text-amber-400" />
                                    Loading announcements list...
                                </div>
                            ) : postsList.length === 0 ? (
                                <p className="text-xs text-gray-500 italic py-2">No announcements found in Content Hub. Try uploading a custom file instead.</p>
                            ) : (
                                <div className="max-h-[180px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                                    {postsList.map(post => {
                                        const isSelected = bannerImage === post.image;
                                        return (
                                            <div 
                                                key={post.id}
                                                onClick={() => setBannerImage(post.image || '')}
                                                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected 
                                                    ? 'bg-amber-500/10 border-amber-500 shadow-md' 
                                                    : 'bg-black/30 border-white/5 hover:border-white/15'
                                                }`}
                                            >
                                                {post.image ? (
                                                    <img src={`${axios.defaults.baseURL.replace('/api', '')}/storage/posts/${post.image}`} alt="" className="w-12 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                                                ) : (
                                                    <div className="w-12 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shrink-0 text-gray-500 text-xs">No Pic</div>
                                                )}
                                                <div className="flex-grow min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{post.title}</p>
                                                    <p className="text-[9px] text-gray-500 mt-0.5">{new Date(post.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Live Preview Panel */}
                    <div className="bg-[#05030d] border border-white/5 p-5 rounded-[2rem] flex flex-col justify-between min-h-[220px]">
                        <div>
                            <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest block mb-4 text-center">Live Preview inside Student Overview Widget</span>
                            
                            {uploadingBanner ? (
                                <div className="h-32 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/10 gap-3">
                                    <Loader2 className="animate-spin text-amber-500" size={24} />
                                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Uploading Image...</span>
                                </div>
                            ) : (
                                <div className="relative h-32 rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                                    <img 
                                        src={bannerImage ? `${axios.defaults.baseURL.replace('/api', '')}/storage/posts/${bannerImage}` : `/upgrade_banner.png`} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3.5">
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded">Special Offer</span>
                                            <span className="text-[8px] font-bold text-white/50">{bannerImage ? 'Custom Banner Active' : 'Default cosmic Banner Active'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {bannerImage && (
                            <div className="flex justify-end mt-4">
                                <button 
                                    onClick={() => setBannerImage('')}
                                    className="px-4.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95"
                                >
                                    Reset to Default Cosmic Banner
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Subject-Specific Upgrade Targets (Fixed Price Setup) */}
            <div className="space-y-6">
                <h3 className="text-lg md:text-xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                    <span className="w-10 h-10 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center shadow-md">
                        <BookOpen size={20} />
                    </span>
                    Subject Upgrade Prices (Fixed Targets)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {uniqueSubjects.map(sub => {
                        const values = pricingValues.subjects[sub.id] || { full: sub.price || 34500 };
                        return (
                            <div key={sub.id} className="bg-[#121124] border-2 border-white/10 p-6 rounded-[2rem] shadow-md flex flex-col justify-between gap-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h4 className="text-lg font-black text-white tracking-wide">{sub.name}</h4>
                                        <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider mt-1">
                                            Code: {sub.code || 'N/A'} • Stream: {sub.stream || 'General'}
                                        </p>
                                    </div>
                                    <span className="text-xs bg-black/40 border border-white/10 text-gray-300 font-bold px-3 py-1.5 rounded-lg shrink-0">
                                        Base Price: <span className="text-emerald-400 font-black">{formatCurrency(sub.price || 0)}</span>
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                                        Full Upgrade Target Price
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">LKR</span>
                                        <input 
                                            type="number" 
                                            value={values.full ?? ''} 
                                            onChange={(e) => handleSubjectPriceChange(sub.id, e.target.value)} 
                                            className="w-full bg-black/55 border border-white/15 focus:border-indigo-500 rounded-xl py-3 pl-14 pr-4 text-md text-white focus:outline-none transition-all font-black"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. BATCH LEVEL BUNDLE DISCOUNTS SECTION */}
            <div className="bg-[#121124] border-2 border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6">
                <div 
                    onClick={() => setEnableBundle(!enableBundle)}
                    className="flex items-center justify-between border-b border-white/5 pb-4 cursor-pointer select-none group"
                >
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] rounded-xl flex items-center justify-center">
                            <Gift size={20} />
                        </span>
                        <div>
                            <h3 className="text-md font-black text-white uppercase tracking-wider">Enable Bundle Discounts</h3>
                            <p className="text-xs text-gray-400 font-semibold leading-relaxed mt-0.5">
                                Set up custom bulk pricing packages based on student subject counts.
                            </p>
                        </div>
                    </div>
                    {enableBundle ? (
                        <CheckSquare className="text-[#f43f5e]" size={24} strokeWidth={3} />
                    ) : (
                        <Square className="text-gray-500" size={24} />
                    )}
                </div>

                {enableBundle && (
                    <div className="space-y-6 pt-2 animate-in fade-in duration-300">
                        {/* A. Select subjects eligible for Bundle */}
                        <div className="space-y-2">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Select subjects eligible for Bundle Discounts</span>
                            <div className="flex flex-wrap gap-2.5">
                                {uniqueSubjects.map(sub => {
                                    const isChecked = bundleSubjects.includes(sub.id);
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => toggleBundleSubject(sub.id)}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
                                                isChecked
                                                ? 'bg-[#f43f5e]/15 border-[#f43f5e] text-white'
                                                : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            {sub.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* B. Enter total prices */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* 2 Subjects total */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-300">2 Subjects Total Full Price</span>
                                    <span className="text-[10px] text-gray-500">Standard Price: {formatCurrency(avgPrice * 2)}</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-[#f43f5e]">LKR</span>
                                    <input 
                                        type="number"
                                        value={bundle2Price ?? ''}
                                        onChange={(e) => setBundle2Price(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/55 border border-white/15 focus:border-[#f43f5e] rounded-xl py-3.5 pl-14 pr-4 text-md text-white font-black focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                {bundle2Price > 0 && bundle2Price < avgPrice * 2 && (
                                    <span className="text-[10px] text-emerald-400 font-bold block">
                                        Saves LKR {Math.round(avgPrice * 2 - bundle2Price).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {/* 3 Subjects total */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-300">3 Subjects Total Full Price</span>
                                    <span className="text-[10px] text-gray-500">Standard Price: {formatCurrency(avgPrice * 3)}</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-[#f43f5e]">LKR</span>
                                    <input 
                                        type="number"
                                        value={bundle3Price ?? ''}
                                        onChange={(e) => setBundle3Price(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/55 border border-white/15 focus:border-[#f43f5e] rounded-xl py-3.5 pl-14 pr-4 text-md text-white font-black focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                {bundle3Price > 0 && bundle3Price < avgPrice * 3 && (
                                    <span className="text-[10px] text-emerald-400 font-bold block">
                                        Saves LKR {Math.round(avgPrice * 3 - bundle3Price).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. INSTALLMENT METHOD CONFIGURATIONS SECTION */}
            <div className="bg-[#121124] border-2 border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6">
                <div 
                    onClick={() => setEnableInstallments(!enableInstallments)}
                    className="flex items-center justify-between border-b border-white/5 pb-4 cursor-pointer select-none group"
                >
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
                            <CreditCard size={20} />
                        </span>
                        <div>
                            <h3 className="text-md font-black text-white uppercase tracking-wider">Enable Installment Method</h3>
                            <p className="text-xs text-gray-400 font-semibold leading-relaxed mt-0.5">
                                Set up structured multi-step payment schedules with custom amounts and days offsets.
                            </p>
                        </div>
                    </div>
                    {enableInstallments ? (
                        <CheckSquare className="text-purple-500" size={24} strokeWidth={3} />
                    ) : (
                        <Square className="text-gray-500" size={24} />
                    )}
                </div>

                {enableInstallments && (
                    <div className="space-y-8 pt-2 animate-in fade-in duration-300">
                        {/* A. Select subjects eligible for installments */}
                        <div className="space-y-2">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Select subjects eligible for Installment Options</span>
                            <div className="flex flex-wrap gap-2.5">
                                {uniqueSubjects.map(sub => {
                                    const isChecked = installmentSubjects.includes(sub.id);
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => toggleInstallmentSubject(sub.id)}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
                                                isChecked
                                                ? 'bg-purple-500/15 border-purple-500 text-white'
                                                : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            {sub.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* B. Installment schedule builder for 1, 2 & 3 subjects */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                            {/* Plan 0: 1 Subject Installments */}
                            <div className="bg-[#05030d] border border-white/5 p-6 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-sm font-black uppercase tracking-wider text-purple-300">1 Subject Installment Steps</span>
                                    <button 
                                        onClick={() => addInstallmentStep(1)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                                    >
                                        <Plus size={11} /> Add Step
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {installments1.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic text-center py-6">No installment steps defined. Click "Add Step" to configure.</p>
                                    ) : installments1.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/5 p-3.5 rounded-xl text-xs">
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider shrink-0 w-14">Step #{idx + 1}</span>
                                            
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] text-gray-500 font-extrabold uppercase">Amount (LKR)</label>
                                                <input 
                                                    type="number"
                                                    value={step.amount ?? ''}
                                                    onChange={(e) => handleInstallmentEdit(1, idx, 'amount', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold"
                                                    placeholder="Amount"
                                                />
                                            </div>

                                            {idx > 0 ? (
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[9px] text-gray-500 font-extrabold uppercase">Due Offset (Days)</label>
                                                    <input 
                                                        type="number"
                                                        value={step.days ?? ''}
                                                        onChange={(e) => handleInstallmentEdit(1, idx, 'days', e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold"
                                                        placeholder={`Days after Step ${idx}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-1 text-center text-slate-500 py-3 font-semibold uppercase text-[9px] border border-dashed border-white/5 rounded-lg shrink-0 mt-4 self-center bg-black/10">
                                                    Paid Upfront
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => deleteInstallmentStep(1, idx)}
                                                className="p-2 text-red-400 hover:text-red-300 bg-white/5 rounded-lg shrink-0 mt-4"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Plan 1: 2 Subjects Installments */}
                            <div className="bg-[#05030d] border border-white/5 p-6 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-sm font-black uppercase tracking-wider text-purple-300">2 Subjects Installment Steps</span>
                                    <button 
                                        onClick={() => addInstallmentStep(2)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                                    >
                                        <Plus size={11} /> Add Step
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {installments2.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic text-center py-6">No installment steps defined. Click "Add Step" to configure.</p>
                                    ) : installments2.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/5 p-3.5 rounded-xl text-xs">
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider shrink-0 w-14">Step #{idx + 1}</span>
                                            
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] text-gray-500 font-extrabold uppercase">Amount (LKR)</label>
                                                <input 
                                                    type="number"
                                                    value={step.amount ?? ''}
                                                    onChange={(e) => handleInstallmentEdit(2, idx, 'amount', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold"
                                                    placeholder="Amount"
                                                />
                                            </div>

                                            {idx > 0 ? (
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[9px] text-gray-500 font-extrabold uppercase">Due Offset (Days)</label>
                                                    <input 
                                                        type="number"
                                                        value={step.days ?? ''}
                                                        onChange={(e) => handleInstallmentEdit(2, idx, 'days', e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold"
                                                        placeholder={`Days after Step ${idx}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-1 text-center text-slate-500 py-3 font-semibold uppercase text-[9px] border border-dashed border-white/5 rounded-lg shrink-0 mt-4 self-center bg-black/10">
                                                    Paid Upfront
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => deleteInstallmentStep(2, idx)}
                                                className="p-2 text-red-400 hover:text-red-300 bg-white/5 rounded-lg shrink-0 mt-4"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Plan 2: 3 Subjects Installments */}
                            <div className="bg-[#05030d] border border-white/5 p-6 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-sm font-black uppercase tracking-wider text-purple-300">3 Subjects Installment Steps</span>
                                    <button 
                                        onClick={() => addInstallmentStep(3)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                                    >
                                        <Plus size={11} /> Add Step
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {installments3.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic text-center py-6">No installment steps defined. Click "Add Step" to configure.</p>
                                    ) : installments3.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/5 p-3.5 rounded-xl text-xs">
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider shrink-0 w-14">Step #{idx + 1}</span>
                                            
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] text-gray-500 font-extrabold uppercase">Amount (LKR)</label>
                                                <input 
                                                    type="number"
                                                    value={step.amount ?? ''}
                                                    onChange={(e) => handleInstallmentEdit(3, idx, 'amount', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold"
                                                    placeholder="Amount"
                                                />
                                            </div>

                                            {idx > 0 ? (
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[9px] text-gray-500 font-extrabold uppercase">Due Offset (Days)</label>
                                                    <input 
                                                        type="number"
                                                        value={step.days ?? ''}
                                                        onChange={(e) => handleInstallmentEdit(3, idx, 'days', e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold"
                                                        placeholder={`Days after Step ${idx}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-1 text-center text-slate-500 py-3 font-semibold uppercase text-[9px] border border-dashed border-white/5 rounded-lg shrink-0 mt-4 self-center bg-black/10">
                                                    Paid Upfront
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => deleteInstallmentStep(3, idx)}
                                                className="p-2 text-red-400 hover:text-red-300 bg-white/5 rounded-lg shrink-0 mt-4"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Save Configuration Action Button */}
            <div className="flex justify-end pt-4 relative z-10">
                <button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="relative flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-500 text-white font-black text-xs md:text-sm uppercase tracking-widest px-10 py-5 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95 outline-none border border-transparent"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Saving Configurations...</span>
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            <span>Save Upgrade Configurations</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default UpgradePricingConfig;