import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../../../api/axios';
import { UploadCloud, CreditCard, ChevronRight, Wallet, ArrowLeft, CheckCircle, Tag, X, Info, Camera, Ban, Paperclip, User, BookOpen, MonitorPlay } from 'lucide-react';
import toast from 'react-hot-toast';

import correctCdmImg from '../../../assets/correct-cdm.jpg';
import wrongCdmImg from '../../../assets/wrong-cdm.jpg';
import correctReceiptImg from '../../../assets/correct-receipt.jpg';
import wrongReceiptImg from '../../../assets/wrong-receipt.jpg';

const EnrollmentTab = ({ businesses, setActiveTab }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectionLevel, setSelectionLevel] = useState(0);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState(null); 

  const [activeStream, setActiveStream] = useState('All');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  const [enrolledSubjects, setEnrolledSubjects] = useState([]); 
  const [groupPaidSubjects, setGroupPaidSubjects] = useState({}); 
  const [fullPaidSubjects, setFullPaidSubjects] = useState([]); 
  const [walletBalance, setWalletBalance] = useState(0); 
  
  const [showInstallmentPrompt, setShowInstallmentPrompt] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSlipInstructions, setShowSlipInstructions] = useState(false); 

  const [finalPaymentType, setFinalPaymentType] = useState(null); 
  const [availableInstallmentPlan, setAvailableInstallmentPlan] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('slip'); 
  const [slipFiles, setSlipFiles] = useState([]); 
  const [remark, setRemark] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paycorpIframeUrl, setPaycorpIframeUrl] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 🔥 Developer Lock State 🔥
  const [devLockClickCount, setDevLockClickCount] = useState(0);
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const lockTimeout = useRef(null);

  const saveEnrollmentRef = useRef();
  
  useEffect(() => {
      saveEnrollmentRef.current = saveEnrollmentToBackend;
  });

  useEffect(() => {
      if (devLockClickCount >= 5) {
          if (!isDevUnlocked) {
              setIsDevUnlocked(true);
              toast.success("Developer Mode Unlocked: Sampath IPG (Test) Enabled!", {
                  style: { background: '#10b981', color: 'white' },
                  iconTheme: { primary: 'white', secondary: '#10b981' }
              });
          }
          setDevLockClickCount(0);
      }
  }, [devLockClickCount, isDevUnlocked]);

  useEffect(() => {
      const handleMessage = async (event) => {
          if (event.data?.type === 'PAYCORP_COMPLETE') {
              setPaycorpIframeUrl(null);
              const { reqid, businessId } = event.data;
              try {
                  setIsSubmitting(true);
                  const res = await axios.post('/student/paycorp-complete', { reqid, businessId });
                  if (res.data?.success) {
                      toast.success("Payment successful! Processing enrollment...");
                      if (saveEnrollmentRef.current) {
                          await saveEnrollmentRef.current("paycorp", reqid);
                      }
                  } else {
                      toast.error("Payment failed or cancelled.");
                  }
              } catch (e) {
                  toast.error("Error verifying payment.");
              } finally {
                  setIsSubmitting(false);
                  submitLock.current = false;
              }
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTitleClick = () => {
      setDevLockClickCount(prev => prev + 1);
      if (lockTimeout.current) clearTimeout(lockTimeout.current);
      lockTimeout.current = setTimeout(() => setDevLockClickCount(0), 1000);
  };
  const submitLock = useRef(false);

  const backendBaseUrl = axios.defaults.baseURL.replace('/api', '');

  const getImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') 
      ? '/logo.png' 
      : `${backendBaseUrl}/storage/icons/${imageName}`;

  useEffect(() => {
      axios.get('/student/my-enrolled-subjects')
           .then(res => {
               if (Array.isArray(res.data)) {
                   setEnrolledSubjects(res.data);
               } else {
                   setEnrolledSubjects(res.data.enrolledSubjects || []);
                   setGroupPaidSubjects(res.data.groupPaidSubjects || {});
                   setFullPaidSubjects(res.data.fullPaidSubjects || []);
                   setWalletBalance(res.data.walletBalance || 0);
               }
           })
           .catch(e => console.error("Error fetching enrolled subjects"));
  }, []);

  useEffect(() => {
      if (location.state?.autoSelect && businesses.length > 0) {
          const { businessId, batchId, groupId, subjects } = location.state.autoSelect;
          const biz = businesses.find(b => b.id === businessId);
          if (biz) {
              setSelectedBusiness(biz);
              setSelectionLevel(1);
              const bat = biz.batches?.find(b => b.id === batchId);
              if (bat) {
                  setSelectedBatch(bat);
                  const grp = bat.groups?.find(g => g.id === groupId);
                  if (grp) {
                      setPaymentPlan(grp.type === 1 ? 'monthly' : 'full');
                      setSelectedGroup(grp);
                      
                      if (subjects) {
                          try {
                              const parsedSubjects = JSON.parse(subjects);
                              setSelectedSubjects(parsedSubjects.map(Number));
                          } catch(e) {}
                      } else {
                          setSelectedSubjects([]);
                      }
                      
                      setSelectionLevel(3); // Level 3 is the final step
                  } else {
                      setSelectionLevel(2);
                  }
              }
          }
          // Clear state so it doesn't loop on re-renders
          navigate(location.pathname, { replace: true, state: {} });
      }
  }, [location.state, businesses, navigate]);

  const [upgradeTrack, setUpgradeTrack] = useState('monthly'); // 'monthly' or 'full'
  const [upgradeData, setUpgradeData] = useState(null);
  const [isUpgradeEligible, setIsUpgradeEligible] = useState(false);
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState(false);

  useEffect(() => {
      axios.get('/upgrade-pricing/calculate')
           .then(res => {
               if (res.data && res.data.eligible) {
                   setIsUpgradeEligible(true);
                   setUpgradeData(res.data);
               } else if (res.data && res.data.pendingUpgrade) {
                   setHasPendingUpgrade(true);
                   setUpgradeData(res.data);
               }
           })
           .catch(e => console.error("Error fetching upgrade eligibility:", e));
  }, []);

  useEffect(() => {
      if (showPaymentModal || showInstallmentPrompt) {
          setTimeout(() => {
              const container = document.getElementById('enrollment-main-container');
              if (container) {
                  let el = container;
                  while (el && el !== document.body) {
                      const style = window.getComputedStyle(el);
                      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                          el.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                      el = el.parentElement;
                  }
                  container.scrollTo({ top: 0, behavior: 'smooth' });
              }
              window.scrollTo({ top: 0, behavior: 'smooth' }); // Fallback
          }, 50);
      }
  }, [showPaymentModal, showInstallmentPrompt]);

  const parseStreams = (streamString) => streamString ? streamString.split(',').map(s => s.trim()).filter(s => s) : [];
  
  const getFilteredBatches = () => selectedBusiness?.batches || [];
  
  const getFilteredGroups = () => {
    if (!selectedBatch) return [];
    if (paymentPlan === 'monthly') return selectedBatch.groups.filter(g => g.type === 1).sort((a, b) => a.itemOrder - b.itemOrder);
    if (paymentPlan === 'full') return selectedBatch.groups.filter(g => g.type !== 1).sort((a, b) => a.itemOrder - b.itemOrder);
    return [];
  };

  const getFilteredCourses = () => {
    if (!selectedGroup || !selectedGroup.courses) return [];
    let courses = selectedGroup.courses;
    
    if (activeStream !== 'All') {
        courses = courses.filter(c => {
            let parsedStreams = [];
            try {
                if (c.streams && typeof c.streams === 'string') parsedStreams = JSON.parse(c.streams);
                else if (Array.isArray(c.streams)) parsedStreams = c.streams;
            } catch(e) {}
            if (parsedStreams && parsedStreams.length > 0 && (parsedStreams.includes(activeStream) || parsedStreams.includes('Common Subjects') || parsedStreams.includes('Common'))) return true;
            if (c.stream && (c.stream.includes(activeStream) || c.stream.includes('Common'))) return true;
            return false;
        });
    }

    const uniqueCourses = [];
    const seenNames = new Set();
    for (let c of courses) {
        const cleanName = c.name.trim().toLowerCase().replace(/\s+/g, ' '); 
        if (!seenNames.has(cleanName)) {
            seenNames.add(cleanName);
            uniqueCourses.push(c);
        }
    }
    return uniqueCourses;
  };

  const getActiveDiscount = () => {
      if (!selectedGroup || !selectedGroup.discount_rules) return null;
      
      let parsedRules = [];
      try {
          parsedRules = typeof selectedGroup.discount_rules === 'string' 
              ? JSON.parse(selectedGroup.discount_rules) 
              : selectedGroup.discount_rules;
      } catch(e) {
          return null;
      }

      if (!parsedRules || !Array.isArray(parsedRules) || parsedRules.length === 0) return null;

      const courses = getFilteredCourses();
      const eligibleCount = courses.filter(c => selectedSubjects.includes(c.id) && !c.isDiscountExcluded).length;

      const sortedRules = [...parsedRules].sort((a, b) => Number(b.courseCount) - Number(a.courseCount));
      
      for (const rule of sortedRules) {
          if (eligibleCount >= Number(rule.courseCount)) {
              return {
                  packagePrice: (rule.packagePrice !== undefined && rule.packagePrice !== null && rule.packagePrice !== '') ? Number(rule.packagePrice) : null,
                  newPricePerCourse: (rule.pricePerCourse !== undefined && rule.pricePerCourse !== null && rule.pricePerCourse !== '') ? Number(rule.pricePerCourse) : null,
                  fixedDiscount: rule.fixedDiscount ? Number(rule.fixedDiscount) : 0,
                  minSubjectsRequired: Number(rule.courseCount)
              };
          }
      }
      return null;
  };

  const calculateTotal = () => {
    const courses = getFilteredCourses();
    if (!selectedGroup || !courses || selectedSubjects.length === 0) return 0;
    
    const activeDiscount = getActiveDiscount();
    let total = 0;

    if (activeDiscount && activeDiscount.packagePrice !== null) {
        total = activeDiscount.packagePrice;
        courses.filter(c => selectedSubjects.includes(c.id) && c.isDiscountExcluded).forEach(course => {
            let cPrice = course.price || 0;
            if (course.groupPrices) {
                try {
                    const gp = typeof course.groupPrices === 'string' ? JSON.parse(course.groupPrices) : course.groupPrices;
                    const cgp = gp.find(g => parseInt(g.groupId) === parseInt(selectedGroup.id));
                    if (cgp) cPrice = Number(cgp.price);
                } catch(e) {}
            }
            total += Number(cPrice);
        });
    } else {
        courses.filter(c => selectedSubjects.includes(c.id)).forEach(course => {
            let cPrice = course.price || 0;
            if (course.groupPrices) {
                try {
                    const gp = typeof course.groupPrices === 'string' ? JSON.parse(course.groupPrices) : course.groupPrices;
                    const cgp = gp.find(g => parseInt(g.groupId) === parseInt(selectedGroup.id));
                    if (cgp) cPrice = Number(cgp.price);
                } catch(e) {}
            }
            
            if (activeDiscount && activeDiscount.newPricePerCourse !== null && !course.isDiscountExcluded) {
                total += activeDiscount.newPricePerCourse;
            } else {
                total += Number(cPrice);
            }
        });
        
        if (activeDiscount && activeDiscount.fixedDiscount && activeDiscount.fixedDiscount > 0) {
            total = Math.max(0, total - activeDiscount.fixedDiscount);
        }
    }
    
    return total;
  };

  const getOriginalTotal = () => getFilteredCourses().filter(c => selectedSubjects.includes(c.id)).reduce((sum, course) => {
      let cPrice = course.price || 0;
      if (course.groupPrices) {
          try {
              const gp = typeof course.groupPrices === 'string' ? JSON.parse(course.groupPrices) : course.groupPrices;
              const cgp = gp.find(g => parseInt(g.groupId) === parseInt(selectedGroup.id));
              if (cgp) cPrice = Number(cgp.price);
          } catch(e) {}
      }
      return sum + Number(cPrice);
  }, 0);

  const getBasePayable = () => {
      return finalPaymentType === 'installment' && availableInstallmentPlan 
          ? Number(JSON.parse(availableInstallmentPlan.details)[0]?.amount || 0) 
          : calculateTotal();
  };

  const getFinalPayable = () => {
      if (selectedSubjects.length === 0) return 0; 
      if (paymentPlan === 'monthly' && upgradeTrack === 'full' && upgradeData) {
          return upgradeData.fullUpgrade.balanceToPay;
      }
      const base = getBasePayable();
      const total = base - walletBalance; 
      return total > 0 ? total : 0;
  };

  const checkInstallmentEligibility = () => {
      if (paymentPlan !== 'full' || !selectedBatch.installment_plans_parsed) return null;
      const plans = selectedBatch.installment_plans_parsed;
      if(!plans || plans.length === 0) return null;
      let sortedPlans = [...plans].sort((a, b) => b.subjectCount - a.subjectCount);
      for (let plan of sortedPlans) {
          if (selectedSubjects.length >= plan.subjectCount) return plan;
      }
      return null;
  };

  const handleProceedToPay = () => {
      if (selectedSubjects.length === 0) return toast.error("Please select subjects first.");
      const eligiblePlan = checkInstallmentEligibility();
      if (eligiblePlan) {
          setAvailableInstallmentPlan(eligiblePlan);
          setShowInstallmentPrompt(true); 
      } else {
          setFinalPaymentType('pay_full');
          setShowPaymentModal(true); 
      }
  };

  const handleFileChange = (e) => {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...slipFiles, ...newFiles];
      if (totalFiles.length > 4) {
          toast.error("You can only upload up to 4 slips.");
          setSlipFiles(totalFiles.slice(0, 4));
      } else setSlipFiles(totalFiles);
  };

  const removeFile = (index) => setSlipFiles(slipFiles.filter((_, i) => i !== index));

  const openSlipInstructions = () => setShowSlipInstructions(true);
  const closeSlipInstructions = () => setShowSlipInstructions(false);

  const confirmSlipInstructions = () => {
      const fileInput = document.getElementById('slip-upload');
      if (fileInput) {
          fileInput.click();
      }
      setShowSlipInstructions(false); 
  };

  const handleFinalSubmit = async () => {
    // 🔥 FIX 1: State එකට වඩා වේගෙන් වැඩ කරන useRef Lock එක මෙතන දානවා
    if (isSubmitting || submitLock.current) return; 

    if (paymentMethod === 'slip' && slipFiles.length === 0) return toast.error("Please upload your bank slip(s).");
    
    try {
      submitLock.current = true;
      setIsSubmitting(true);
      const amountToPay = getFinalPayable().toFixed(2);
      const orderId = `ORD-${Date.now()}`;

      if (paymentMethod === 'payhere') {
          if (typeof window.payhere === 'undefined') {
              toast.error("PayHere integration is missing! Please refresh the page.");
              setIsSubmitting(false);
              submitLock.current = false;
              throw new Error("window.payhere is undefined.");
          }

          const hashRes = await axios.post('/student/payhere-hash', { amount: amountToPay, orderId: orderId, currency: "LKR" });
          const isSandbox = import.meta.env.VITE_PAYHERE_ENV === 'sandbox';

          const payment = {
              sandbox: isSandbox,
              merchant_id: import.meta.env.VITE_PAYHERE_MERCHANT_ID, 
              return_url: window.location.origin + "/student/dashboard", 
              cancel_url: window.location.origin + "/student/dashboard",
              notify_url: `${backendBaseUrl}/api/student/payhere-notify`, 
              order_id: orderId,
              items: "Course Enrollment",
              amount: amountToPay, 
              currency: "LKR",
              hash: hashRes.data.hash || "",
              first_name: "Student", 
              last_name: "Name",
              email: "student@imacampus.lk",
              phone: "0770000000",
              address: "Sri Lanka",
              city: "Colombo",
              country: "Sri Lanka"
          };

          window.payhere.onCompleted = async function onCompleted(orderId) {
              toast.success("Payment successful! Processing enrollment...");
              await saveEnrollmentToBackend("payhere", orderId);
          };

          window.payhere.onDismissed = function onDismissed() {
              toast.error("Payment dismissed.");
              setIsSubmitting(false);
              submitLock.current = false;
          };

          window.payhere.onError = function onError(error) {
              toast.error("Payment Error: " + error);
              setIsSubmitting(false);
              submitLock.current = false;
          };

          window.payhere.startPayment(payment);

      } else if (paymentMethod === 'paycorp') {
          const initRes = await axios.post('/student/paycorp-init', { 
              amount: amountToPay, 
              orderId: orderId,
              businessId: selectedBusiness.id
          });
          
          if (initRes.data && initRes.data.success && initRes.data.paymentUrl) {
              setShowPaymentModal(false);
              setPaycorpIframeUrl(initRes.data.paymentUrl);
          } else {
              toast.error("Failed to initialize Sampath IPG.");
              setIsSubmitting(false);
              submitLock.current = false;
          }
      } else {
          await saveEnrollmentToBackend("slip", null);
      }
    } catch (error) {
      toast.error(error.message || "Error processing request.");
      setIsSubmitting(false);
      submitLock.current = false; // 🔥 Error එකකදී Lock එක අරිනවා
    }
  };

  const saveEnrollmentToBackend = async (method, payhereOrderId) => {
    const amountToPay = getFinalPayable().toFixed(2);

    let finalRemark = remark;
    if (walletBalance !== 0) {
        const walletNote = walletBalance > 0 
            ? `Wallet Excess (-LKR ${walletBalance.toFixed(2)}) applied.` 
            : `Wallet Due (+LKR ${Math.abs(walletBalance).toFixed(2)}) applied.`;
        finalRemark = finalRemark ? `${finalRemark}\n\n[SYSTEM]: ${walletNote}` : `[SYSTEM]: ${walletNote}`;
    }

    let pMethodChosen = 'monthly';
    if (paymentPlan === 'full') {
        pMethodChosen = finalPaymentType === 'installment' ? 'installment' : 'full';
    }
    if (paymentPlan === 'monthly' && upgradeTrack === 'full' && upgradeData) {
        pMethodChosen = 'full';
        const upgradeNote = `[UPGRADE]: Transitioned from Monthly to FULL Card. Prev Paid: LKR ${upgradeData.totalPaidMonthly.toFixed(2)}`;
        finalRemark = finalRemark ? `${finalRemark} | ${upgradeNote}` : upgradeNote;
    }

    const formData = new FormData();
    formData.append('businessId', selectedBusiness.id);
    formData.append('batchId', selectedBatch.id);
    formData.append('groupId', selectedGroup.id);
    const validSubjects = selectedSubjects.filter(id => getFilteredCourses().some(c => c.id === id));
    formData.append('subjects', JSON.stringify(validSubjects));
    formData.append('paymentMethodChosen', pMethodChosen); 
    formData.append('method', method);
    formData.append('amount', amountToPay); 
    if (finalRemark) formData.append('remark', finalRemark);
    if (payhereOrderId) formData.append('orderId', payhereOrderId);
    if (method === 'slip') slipFiles.forEach(file => formData.append('slipImages', file));

    try {
        setIsSubmitting(true);
        const response = await axios.post('/student/enroll-with-slip', formData);
        if(response.status === 200) {
            toast.success(method === 'slip' ? "Enrollment successful! Awaiting verification." : "Enrollment Confirmed!");
            setShowPaymentModal(false);
            setSlipFiles([]); setRemark(''); setSelectionLevel(0); setSelectedSubjects([]);
            axios.get('/student/my-enrolled-subjects').then(res => {
                if (Array.isArray(res.data)) {
                    setEnrolledSubjects(res.data);
                } else {
                    setEnrolledSubjects(res.data.enrolledSubjects || []);
                    setGroupPaidSubjects(res.data.groupPaidSubjects || {});
                    setFullPaidSubjects(res.data.fullPaidSubjects || []);
                    setWalletBalance(res.data.walletBalance || 0);
                }
            }).catch(e=>{});
            setActiveTab('history'); 
            window.dispatchEvent(new Event('refreshPayments'));
        }
    } catch (error) { 
        toast.error(error.response?.data?.error || "Failed to save enrollment."); 
    } 
    finally { 
        setIsSubmitting(false); 
        submitLock.current = false; // 🔥 Request එක ඉවර වුණාම අනිවාර්යයෙන්ම Lock එක අරිනවා
    }
  };

  const handleBackNavigation = () => {
    if (selectionLevel > 0) {
      if (selectionLevel === 3) {
          const hasMonthly = selectedBatch?.groups?.some(g => g.type === 1) || false;
          const hasFull = selectedBatch?.groups?.some(g => g.type !== 1) || false;
          if ((hasMonthly && !hasFull) || (hasFull && !hasMonthly)) {
              // Skipped Level 2, go straight back to Level 1
              setSelectionLevel(1);
              setSelectedBatch(null);
              setPaymentPlan(null);
              setSelectedGroup(null);
              setSelectedSubjects([]);
              setActiveStream('All');
              return;
          }
      }
      setSelectionLevel(prev => prev - 1);
      if (selectionLevel === 1) setSelectedBusiness(null);
      if (selectionLevel === 2) setSelectedBatch(null);
      if (selectionLevel === 3) { setPaymentPlan(null); setSelectedGroup(null); setSelectedSubjects([]); setActiveStream('All'); }
    }
  };

  const actualStreams = selectedBusiness ? parseStreams(selectedBusiness.streams).filter(s => s !== 'All') : [];
  const showStreamFilter = actualStreams.length >= 2;
  const availableStreams = [...actualStreams, 'All'];

  return (
    <div id="enrollment-main-container" className="w-full h-full relative text-white pb-[100px] lg:pb-0 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"> 
        <div className="w-full mx-auto pb-6 md:pt-4">
            {selectionLevel > 0 && (
                <div className="mb-6 relative z-20">
                    <button onClick={handleBackNavigation} className="text-white/80 font-medium hover:text-white bg-black/20 backdrop-blur-xl hover:bg-black/20 backdrop-blur-xl px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors w-max border border-white/20">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </button>
                </div>
            )}

            <div className="w-full">
                
                {/* LEVEL 0 */}
                {selectionLevel === 0 && (
                    <div className="space-y-8 w-full animate-fade-in">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-8 text-center uppercase tracking-wide">All Courses</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {businesses.map(business => (
                          <div key={business.id} onClick={() => { setSelectedBusiness(business); setSelectionLevel(1); }}
                            className="cursor-pointer rounded-[2.5rem] overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-red-500/50 shadow-xl transition-all duration-300 w-full flex flex-col group">
                            <div className="h-48 w-full relative border-b border-white/20 p-6 bg-white/20 backdrop-blur-xl flex items-center justify-center">
                               <img src={getImageUrl(business.logo)} alt="" className="max-w-full max-h-full object-contain drop-shadow-lg" />
                            </div>
                            <div className="p-6 flex-1 flex items-center justify-center">
                              <h3 className="font-bold text-lg text-white text-center group-hover:text-red-400 transition-colors">{business.name}</h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                )}

                {/* LEVEL 1 */}
                {selectionLevel === 1 && (
                    <div className="space-y-8 w-full animate-fade-in">
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-8 text-center uppercase tracking-wide">Select A Batch</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getFilteredBatches().map(batch => {
                          const hasMonthly = batch.groups?.some(g => g.type === 1) || false;
                          const hasFull = batch.groups?.some(g => g.type !== 1) || false;
                          
                          return (
                          <div key={batch.id} onClick={() => { 
                              setSelectedBatch(batch); 
                              if (hasMonthly && !hasFull) {
                                  setPaymentPlan('monthly');
                                  setSelectionLevel(3);
                              } else if (hasFull && !hasMonthly) {
                                  setPaymentPlan('full');
                                  setSelectionLevel(3);
                              } else {
                                  setSelectionLevel(2); 
                              }
                          }}
                            className="cursor-pointer rounded-[2.5rem] bg-black/20 backdrop-blur-xl border border-white/20 hover:bg-black/20 backdrop-blur-xl hover:border-red-500/50 backdrop-blur-md shadow-xl transition-all duration-300 flex flex-col sm:flex-row items-center p-4 md:p-6 group">
                            <div className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 bg-black/20 backdrop-blur-xl rounded-2xl p-3 flex justify-center items-center border border-white/20 mx-auto sm:mx-0 mb-4 sm:mb-0">
                              <img src={getImageUrl(batch.logo || selectedBusiness.logo)} className="max-w-full max-h-full object-contain drop-shadow-md" alt="" />
                            </div>
                            <div className="p-2 sm:p-6 flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
                              <h4 className="font-bold text-white text-lg md:text-2xl group-hover:text-red-400 transition-colors">{batch.name}</h4>
                              {batch.description && <p className="text-xs sm:text-sm text-white/90 font-bold mt-2 font-medium">{batch.description}</p>}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                )}

                {/* LEVEL 2 */}
                {selectionLevel === 2 && (
                    <div className="space-y-8 w-full max-w-5xl mx-auto animate-fade-in">
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-8 text-center uppercase tracking-wide">Select Payment Plan</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div onClick={() => { setPaymentPlan('full'); setSelectionLevel(3); }} 
                             className={`cursor-pointer rounded-[2.5rem] p-8 md:p-14 text-center border transition-colors flex flex-col items-center justify-center ${paymentPlan === 'full' ? 'bg-red-600/20 border-red-500' : 'bg-black/20 backdrop-blur-xl border-white/20 hover:bg-black/20 backdrop-blur-xl hover:border-red-500/50'}`}>
                          <div className={`p-5 rounded-3xl mb-4 transition-colors ${paymentPlan === 'full' ? 'bg-red-500/20 text-red-500' : 'bg-black/20 backdrop-blur-xl text-white/80 font-medium'}`}>
                            <Wallet size={48} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-black text-xl md:text-3xl text-white mb-2">One-Time Payment</h3>
                          <p className="text-sm md:text-base text-white/90 font-bold">Pay upfront and unlock bundle discounts.</p>
                        </div>
                        <div onClick={() => { setPaymentPlan('monthly'); setSelectionLevel(3); }} 
                             className={`cursor-pointer rounded-[2.5rem] p-8 md:p-14 text-center border transition-colors flex flex-col items-center justify-center ${paymentPlan === 'monthly' ? 'bg-red-600/20 border-red-500' : 'bg-black/20 backdrop-blur-xl border-white/20 hover:bg-black/20 backdrop-blur-xl hover:border-red-500/50'}`}>
                          <div className={`p-5 rounded-3xl mb-4 transition-colors ${paymentPlan === 'monthly' ? 'bg-red-500/20 text-red-500' : 'bg-black/20 backdrop-blur-xl text-white/80 font-medium'}`}>
                            <CreditCard size={48} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-black text-xl md:text-3xl text-white mb-2">Monthly Payment</h3>
                          <p className="text-sm md:text-base text-white/90 font-bold">Pay your subject fees on a monthly basis.</p>
                        </div>
                      </div>
                    </div>
                )}

                {/* LEVEL 3 */}
                {selectionLevel === 3 && (
                    <div className="w-full animate-fade-in relative flex flex-col lg:flex-row gap-6 items-start">
                      
                      <div className="flex-1 bg-black/20 backdrop-blur-xl border border-white/20 backdrop-blur-md shadow-xl rounded-[2.5rem] p-4 md:p-8 w-full overflow-hidden">
                          <div className="flex items-center space-x-3 mb-6 bg-black/20 backdrop-blur-xl p-3 rounded-2xl w-max border border-white/20 max-w-full">
                              <div className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-xl text-red-500 flex items-center justify-center shrink-0">
                                {paymentPlan === 'monthly' ? <CreditCard size={20} /> : <Wallet size={20} />}
                              </div>
                              <div className="pr-3 min-w-0">
                                  <h2 className="text-sm md:text-base font-extrabold text-white truncate">{selectedBatch.name}</h2>
                                  <p className="text-red-400 mt-0.5 text-[10px] font-bold uppercase tracking-widest">{paymentPlan === 'full' ? 'One-Time Plan' : 'Monthly Plan'}</p>
                              </div>
                          </div>

                          {showStreamFilter && (
                              <div className="mb-6">
                                  <h4 className="text-xs font-bold text-white/80 font-medium mb-3 uppercase tracking-wider">Select Stream</h4>
                                  <div className="flex flex-wrap gap-2">
                                      {availableStreams.map(stream => (
                                          <button key={stream} onClick={() => { setActiveStream(stream); setSelectedSubjects([]); }}
                                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                                                  activeStream === stream 
                                                  ? 'bg-red-600 text-white border border-red-500' 
                                                  : 'bg-black/20 backdrop-blur-xl border border-white/20 text-white/90 font-bold hover:bg-black/20 backdrop-blur-xl hover:text-white'
                                              }`}>
                                              {stream}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {paymentPlan === 'monthly' && (
                            <div className="mb-6">
                              <h4 className="text-xs font-bold text-white/80 font-medium mb-3 uppercase tracking-wider">Select Month</h4>
                              <div className="flex flex-wrap gap-2">
                                {getFilteredGroups().map(group => (
                                  <button key={group.id} onClick={() => { 
                                    setSelectedGroup(group); 
                                    setSelectedSubjects([]); 
                                    setUpgradeTrack('monthly');
                                  }}
                                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                                      selectedGroup?.id === group.id 
                                      ? 'bg-red-600 text-white border border-red-500' 
                                      : 'bg-black/20 backdrop-blur-xl border border-white/20 text-white/90 font-bold hover:bg-black/20 backdrop-blur-xl hover:text-white'
                                    }`}>
                                    {group.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {paymentPlan === 'full' && getFilteredGroups().length > 0 && !selectedGroup && setSelectedGroup(getFilteredGroups()[0])}

                          {selectedGroup && (
                            <div className="space-y-4 pb-24 lg:pb-0 w-full"> 
                               <h4 className="text-xs font-bold text-white/80 font-medium mb-2 uppercase tracking-wider">Choose Subjects</h4>
                               
                               <div className="flex flex-col gap-3 w-full">
                                  {(() => {
                                      const activeDiscount = getActiveDiscount();
                                      return getFilteredCourses().map(course => {
                                        let isAlreadyPaid = false;
                                        if (paymentPlan === 'monthly') {
                                        isAlreadyPaid = groupPaidSubjects[selectedGroup.id]?.includes(course.id) || fullPaidSubjects.includes(course.id);
                                    } else {
                                        isAlreadyPaid = fullPaidSubjects.includes(course.id);
                                    }
                                    
                                    let courseImage = null;
                                    let cPrice = course.price || 0;
                                    try {
                                        const parsedGroupPrices = typeof course.groupPrices === 'string' ? JSON.parse(course.groupPrices) : course.groupPrices;
                                        const currentGroupPrice = parsedGroupPrices.find(gp => parseInt(gp.groupId) === parseInt(selectedGroup.id));
                                        if (currentGroupPrice && currentGroupPrice.lecturerImage) courseImage = currentGroupPrice.lecturerImage;
                                        else if (parsedGroupPrices.length > 0 && parsedGroupPrices[0].lecturerImage) courseImage = parsedGroupPrices[0].lecturerImage; 
                                        if (currentGroupPrice && currentGroupPrice.price) cPrice = Number(currentGroupPrice.price);
                                    } catch(e) {}

                                    return (
                                    <label key={course.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-5 rounded-[1.5rem] border transition-all gap-4 w-full shadow-md hover:shadow-xl hover:-translate-y-0.5 ${
                                        isAlreadyPaid ? 'opacity-60 cursor-not-allowed bg-black/40 backdrop-blur-xl border-white/10' :
                                        selectedSubjects.includes(course.id) ? 'bg-red-950/40 border-red-500 cursor-pointer ring-1 ring-red-500/50' : 'bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/30 hover:bg-black/50 cursor-pointer'
                                      }`}>
                                      
                                      <div className="flex items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
                                          <div className="relative flex items-center justify-center shrink-0">
                                              <input type="checkbox" disabled={isAlreadyPaid} className="shrink-0 w-5 h-5 rounded border-2 border-white/30 bg-black/20 backdrop-blur-xl text-red-600 focus:ring-red-600 cursor-pointer appearance-none checked:bg-red-600 checked:border-transparent disabled:opacity-50"
                                                checked={selectedSubjects.includes(course.id)} 
                                                onChange={() => setSelectedSubjects(prev => prev.includes(course.id) ? prev.filter(id => id !== course.id) : [...prev, course.id])} 
                                              />
                                              {selectedSubjects.includes(course.id) && <CheckCircle size={14} className="absolute text-white pointer-events-none" strokeWidth={3}/>}
                                          </div>
                                          <div className="flex flex-col min-w-0 flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="block font-black text-white text-xl truncate w-full md:w-auto md:max-w-[300px] drop-shadow-md" title={course.name}>{course.name}</span>
                                                  {course.code && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest shrink-0 shadow-sm">{course.code}</span>}
                                              </div>
                                              {isAlreadyPaid && <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1"><CheckCircle size={10}/> Already Paid</span>}
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-3 flex-1 min-w-0 w-full md:w-auto md:border-l md:border-white/20 md:pl-4 pl-8 md:pl-0">
                                          {courseImage ? (
                                              <img src={getImageUrl(courseImage)} alt="Lecturer" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white/20 shrink-0" />
                                          ) : (
                                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 backdrop-blur-xl flex items-center justify-center border border-white/20 shrink-0 text-white/80 font-medium">
                                                  <User size={18} />
                                              </div>
                                          )}
                                          <div className="flex flex-col min-w-0">
                                              <span className="text-[10px] text-white/70 font-medium uppercase tracking-widest font-bold">Lecturer</span>
                                              <span className="text-sm md:text-base text-white font-semibold truncate" title={course.lecturerName || 'TBA'}>{course.lecturerName || 'TBA'}</span>
                                          </div>
                                      </div>

                                      <div className="flex flex-col items-start md:items-end flex-1 shrink-0 w-full md:w-auto border-t md:border-none border-white/20 pt-3 md:pt-0">
                                          <span className="text-[7px] text-gray-500 font-black tracking-widest uppercase mb-1">
                                              {isAlreadyPaid ? 'Already Paid' : (activeDiscount && !course.isDiscountExcluded ? (activeDiscount.packagePrice !== null ? 'Package Deal' : (activeDiscount.newPricePerCourse !== null ? 'Bundle Price' : 'Eligible for Bundle')) : 'Regular Price')}
                                          </span>
                                          <div className="flex flex-col items-end">
                                              {activeDiscount && activeDiscount.newPricePerCourse !== null && selectedSubjects.includes(course.id) && !course.isDiscountExcluded && !isAlreadyPaid ? (
                                                  <>
                                                      <span className="text-white/70 font-medium line-through text-[9px] font-medium mb-0.5">LKR {Number(cPrice).toFixed(2)}</span>
                                                      <span className="text-yellow-400 font-black text-xl flex items-center gap-1 drop-shadow-md"><Tag size={14}/> LKR {Number(activeDiscount.newPricePerCourse).toFixed(2)}</span>
                                                  </>
                                              ) : activeDiscount && activeDiscount.packagePrice !== null && selectedSubjects.includes(course.id) && !course.isDiscountExcluded && !isAlreadyPaid ? (
                                                  <>
                                                      <span className="text-emerald-400 font-bold text-[9px] uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mb-0.5 flex items-center gap-1">
                                                          <Tag size={10}/> In Package
                                                      </span>
                                                      <span className="text-white/90 font-black text-xl drop-shadow-md">LKR {Number(cPrice).toFixed(2)}</span>
                                                  </>
                                              ) : (
                                                  <>
                                                    {course.isDiscountExcluded && selectedSubjects.includes(course.id) && !isAlreadyPaid && (
                                                        <span className="text-orange-500 text-[9px] uppercase tracking-widest font-bold mb-0.5">Fixed Price</span>
                                                    )}
                                                    <span className="text-red-400 font-black text-xl drop-shadow-md">LKR {Number(cPrice).toFixed(2)}</span>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                    </label>
                                  );
                                  })
                                  })()}
                               </div>
                               {getFilteredCourses().length === 0 && <div className="text-center py-10 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/20"><p className="text-white/80 font-medium text-sm">No subjects available.</p></div>}
                            </div>
                          )}
                      </div>

                      {/* Sticky Order Summary Desktop */}
                      <div className="fixed bottom-0 left-0 right-0 z-50 lg:sticky lg:top-6 lg:w-[320px] shrink-0 space-y-4">
                         <div className={`bg-black/20 backdrop-blur-2xl lg:bg-black/20 backdrop-blur-xl border-t lg:border border-white/20 lg:rounded-[2.5rem] p-4 lg:p-6 transition-opacity duration-200 ${calculateTotal() > 0 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            
                            <div className="hidden lg:block">
                                <h4 className="text-sm font-extrabold text-white mb-4 uppercase tracking-widest border-b border-white/20 pb-3 flex items-center gap-2"><Wallet size={16} className="text-red-500"/> Order Summary</h4>
                                <div className="space-y-2 text-xs text-white/70 font-medium mb-5 font-medium">
                                    <div className="flex justify-between items-center bg-black/20 backdrop-blur-xl p-2.5 rounded-xl border border-white/20">
                                        <span>Plan:</span> 
                                        <span className="font-bold text-white bg-black/20 backdrop-blur-xl px-2 py-1 rounded">
                                            {paymentPlan === 'full' ? 'One-Time' : upgradeTrack === 'full' ? 'Monthly (Upgrade)' : 'Monthly'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 backdrop-blur-xl p-2.5 rounded-xl border border-white/20">
                                        <span>Subjects Selected:</span> 
                                        <span className="font-bold text-white bg-red-600 px-2 py-1 rounded">{selectedSubjects.length}</span>
                                    </div>
                                    {paymentPlan === 'monthly' && isUpgradeEligible && selectedSubjects.length > 0 && (
                                        <div className="bg-black/20 backdrop-blur-xl p-2.5 rounded-xl border border-white/20 space-y-2">
                                            <span className="block text-[9px] text-white/80 font-medium font-extrabold uppercase tracking-widest text-center">Payment Track</span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button 
                                                    onClick={() => setUpgradeTrack('monthly')}
                                                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${upgradeTrack === 'monthly' ? 'bg-red-600 text-white shadow-sm' : 'bg-black/20 backdrop-blur-xl text-white/80 font-medium hover:bg-black/20 backdrop-blur-xl'}`}
                                                >
                                                    Monthly
                                                </button>
                                                <button 
                                                    onClick={() => setUpgradeTrack('full')}
                                                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${upgradeTrack === 'full' ? 'bg-red-600 text-white shadow-sm' : 'bg-black/20 backdrop-blur-xl text-white/80 font-medium hover:bg-black/20 backdrop-blur-xl'}`}
                                                >
                                                    Upgrade Full
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-4">
                                <div>
                                    <span className="block text-[9px] text-white/80 font-medium uppercase font-bold tracking-widest mb-0.5 lg:text-center">Total Payable</span>
                                    
                                    <span className="block text-xl lg:text-2xl text-white font-black lg:text-center lg:mb-1">LKR {getFinalPayable().toFixed(2)}</span>
                                    
                                    {/* 🔥 FIX: Only show Wallet balance if subjects are selected */}
                                    {selectedSubjects.length > 0 && walletBalance > 0 && <p className="text-emerald-400 font-bold text-[9px] flex items-center lg:justify-center gap-1 mt-1">Wallet Excess Applied: -LKR {walletBalance.toFixed(2)}</p>}
                                    {selectedSubjects.length > 0 && walletBalance < 0 && <p className="text-red-400 font-bold text-[9px] flex items-center lg:justify-center gap-1 mt-1">Previous Dues Added: +LKR {Math.abs(walletBalance).toFixed(2)}</p>}
                                    
                                    {getActiveDiscount() && <p className="text-yellow-400 font-bold text-[9px] flex items-center lg:justify-center gap-1 mt-1"><Tag size={10}/> Saved LKR {(getOriginalTotal() - calculateTotal()).toFixed(2)}</p>}
                                </div>
                                <button onClick={handleProceedToPay} className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-black py-3 lg:py-3.5 px-6 lg:px-0 rounded-xl flex justify-center items-center transition-colors text-xs uppercase tracking-widest border border-red-500/50 whitespace-nowrap">
                                    Proceed <ChevronRight className="ml-1" size={16}/>
                                </button>
                            </div>
                        </div>
                      </div>
                    </div>
                )}
            </div>
        </div>

        {showInstallmentPrompt && createPortal(
            <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-md">
                <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                    <div className="bg-black/20 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 max-w-sm w-full relative shadow-2xl">
                        <button onClick={() => setShowInstallmentPrompt(false)} className="absolute top-4 right-4 text-white/80 font-medium hover:text-white bg-black/20 backdrop-blur-xl p-2 rounded-xl"><X size={18}/></button>
                        <h2 className="text-xl font-extrabold text-white mb-2">Payment Options</h2>
                    <p className="text-white/90 font-bold text-xs mb-6 font-medium">Pay the full amount now or choose installments.</p>
                    
                    <div className="flex flex-col gap-3">
                        <button onClick={() => { setFinalPaymentType('pay_full'); setShowInstallmentPrompt(false); setShowPaymentModal(true); }} 
                                className="w-full bg-black/20 backdrop-blur-xl hover:bg-red-600/20 border border-white/20 hover:border-red-500/50 text-left p-4 rounded-2xl transition-colors group">
                            <span className="block text-[10px] text-white/70 font-medium mb-1 uppercase tracking-widest font-bold group-hover:text-red-400">Option 1</span>
                            <span className="block text-sm text-white font-extrabold mb-1">Pay Full Amount</span>
                            <span className="block text-xl text-red-500 font-black">LKR {Math.max(0, calculateTotal() - walletBalance).toFixed(2)}</span>
                        </button>

                        <button onClick={() => { setFinalPaymentType('installment'); setShowInstallmentPrompt(false); setShowPaymentModal(true); }} 
                                className="w-full bg-black/20 backdrop-blur-xl hover:bg-black/20 backdrop-blur-xl border border-white/20 text-left p-4 rounded-2xl transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="block text-[10px] text-white/70 font-medium uppercase tracking-widest font-bold">Option 2</span>
                                <span className="bg-yellow-500/20 text-yellow-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-yellow-500/30">Available</span>
                            </div>
                            <span className="block text-sm text-white font-extrabold mb-3">Pay via Installments</span>

                            <div className="bg-black/20 backdrop-blur-xl rounded-xl p-3 mb-3 space-y-2 border border-white/20">
                                {availableInstallmentPlan && JSON.parse(availableInstallmentPlan.details).map((step, idx) => (
                                    <div key={idx} className="flex justify-between text-xs font-medium text-white/70 font-medium">
                                        <span>Part {step.step}:</span>
                                        <span className="text-white font-bold bg-black/20 backdrop-blur-xl px-2 rounded border border-white/20">LKR {Number(step.amount).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-red-600 text-white font-extrabold py-3 rounded-xl text-xs text-center shadow-lg">
                                Select & Pay LKR {Math.max(0, (availableInstallmentPlan ? Number(JSON.parse(availableInstallmentPlan.details)[0]?.amount) : 0) - walletBalance).toFixed(2)} Today
                            </div>
                        </button>
                    </div>
                </div>
              </div>
            </div>,
            document.body
        )}

        {showPaymentModal && createPortal(
            <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-md [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                    <div className="bg-[#1a1f2e]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-lg relative shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-extrabold text-white mb-1 select-none" onClick={handleTitleClick}>Submit Payment</h2>
                            <p className="text-white/90 font-bold text-xs">Choose your payment method.</p>
                        </div>
                        <button onClick={() => setShowPaymentModal(false)} className="text-white/80 font-medium hover:text-white bg-black/20 backdrop-blur-xl p-2 rounded-xl"><X size={18}/></button>
                    </div>
                    
                    <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center mb-6 shadow-inner">
                        <span className="block text-[10px] text-white/80 font-medium uppercase font-bold tracking-widest mb-1">Amount to Pay Now</span>
                        <span className="block text-3xl text-red-500 font-black">LKR {getFinalPayable().toFixed(2)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-black/20 backdrop-blur-xl p-1 rounded-2xl border border-white/20 mb-6">
                        <button onClick={() => setPaymentMethod('slip')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${paymentMethod === 'slip' ? 'bg-black/20 backdrop-blur-xl text-white border border-white/20 shadow' : 'text-white/70 font-medium hover:text-white/80 font-medium'}`}>Bank Slip</button>
                        <button onClick={() => setPaymentMethod('paycorp')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${paymentMethod === 'paycorp' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 shadow' : 'text-emerald-500/70 hover:text-emerald-400'}`}>Sampath IPG</button>
                    </div>

                    {paymentMethod === 'paycorp' && (
                        <div className="mb-4 space-y-3">
                            <label className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/10 cursor-pointer hover:bg-black/40 transition">
                                <input 
                                    type="checkbox" 
                                    className="mt-0.5 w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 bg-gray-900 cursor-pointer" 
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                />
                                <span className="text-xs text-white/80 leading-snug">
                                    මා <a href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} className="text-blue-400 font-bold hover:underline">නියමයන් සහ කොන්දේසි</a> කියවා ඊට එකඟ වෙමි. අන්තර්ජාලය හරහා කරන සියලුම ගෙවීම් ආපසු ලබා නොදෙන බව මම තේරුම් ගතිමි.
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="mb-4">
                        {paymentMethod === 'slip' ? (
                            <>
                                <div className="w-full min-h-[160px] flex flex-col justify-center items-center border-2 border-dashed border-white/20 bg-black/20 backdrop-blur-xl rounded-[1.5rem] p-6 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer mb-4 relative overflow-hidden" onClick={openSlipInstructions}>
                                    <div className="absolute top-3 right-3 bg-blue-500 text-white p-1 rounded-full"><Info size={14}/></div>
                                    <input type="file" id="slip-upload" className="hidden" multiple accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} />
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex gap-3 mb-3 text-white/80 group-hover:text-red-500 transition-colors">
                                            <UploadCloud size={32} />
                                            <Camera size={32} />
                                        </div>
                                        <span className="text-white font-bold text-sm mb-1">
                                            {slipFiles.length > 0 ? `${slipFiles.length} File(s) Selected` : 'Click to Upload Slip'}
                                        </span>
                                        <span className="text-[10px] text-white/80 font-medium">Max 4 slips. PNG, JPG, PDF</span>
                                    </div>
                                </div>
                                
                                {slipFiles.length > 0 && (
                                    <div className="mb-4 bg-black/20 backdrop-blur-xl p-3 rounded-xl border border-white/20 space-y-1.5">
                                        {slipFiles.map((file, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 truncate pr-3">
                                                    <Paperclip size={12} className="text-white/70 font-medium shrink-0"/>
                                                    <span className="text-white truncate">{file.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-white/70 font-medium">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                                    <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold text-white/80 font-medium uppercase tracking-widest mb-1 block">Remark (Optional)</label>
                                    <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Type any message..." rows="2" className="w-full bg-black/20 backdrop-blur-xl border border-white/20 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 transition-colors resize-none"></textarea>
                                </div>
                            </>
                        ) : paymentMethod === 'payhere' ? (
                            <div className="bg-black/20 backdrop-blur-xl rounded-[1.5rem] p-6 flex flex-col justify-center items-center h-full min-h-[120px] border border-white/20">
                                <span className="text-white font-black text-2xl tracking-wider">Pay<span className="text-blue-500">Here</span></span>
                                <span className="text-[9px] text-white/70 font-medium uppercase mt-2 font-bold tracking-widest">Secured by Monid</span>
                            </div>
                        ) : (
                            <div className="bg-emerald-900/20 backdrop-blur-xl rounded-[1.5rem] p-6 flex flex-col justify-center items-center h-full min-h-[120px] border border-emerald-500/30">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-full shadow-lg">
                                        <img src="/sampath-logo.png" alt="Sampath" className="w-7 h-7 object-contain" />
                                    </div>
                                    <span className="text-white font-black text-2xl tracking-wider uppercase">Sampath Bank</span>
                                </div>
                                <span className="text-[9px] text-emerald-500/70 uppercase mt-3 font-bold tracking-widest">Paycorp IPG</span>
                            </div>
                        )}
                    </div>

                    <button onClick={handleFinalSubmit} disabled={isSubmitting || (paymentMethod === 'paycorp' && !agreedToTerms)} 
                        className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3.5 rounded-xl transition-colors hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-xs uppercase tracking-widest border border-red-500/50 shadow-lg">
                        {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                    </button>
                </div>
              </div>
            </div>,
            document.body
        )}

        {/* 🔥 SLIP INSTRUCTIONS POPUP 🔥 */}
        {showSlipInstructions && createPortal(
            <div className="fixed inset-0 z-[99999] flex p-4 md:p-8 overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in duration-200 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="m-auto bg-[#1a1f2e]/95 backdrop-blur-3xl border border-white/10 p-5 md:p-8 rounded-[2rem] max-w-2xl w-full shadow-2xl relative">
                    <h3 className="text-lg md:text-2xl font-extrabold text-white mb-4 md:mb-6 border-b border-white/20 pb-3 md:pb-4">ස්ලිප් පත් උඩුගත කිරීමේ උපදෙස් (Slip Upload Instructions)</h3>
                    
                    <div className="space-y-4 md:space-y-6">
                        <div className="bg-black/20 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/20">
                            <h4 className="text-red-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><Camera size={16}/> බැංකු ස්ලිප් (CDM / Bank Deposit)</h4>
                            <ul className="text-xs md:text-sm text-white/70 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                <li>ස්ලිප් පතෙහි <strong className="text-white">මුලු 4ම (4 corners)</strong> පැහැදිලිව පෙනෙන සේ ඡායාරූපය ගන්න.</li>
                                <li>ඡායාරූපය <strong className="text-white">බොඳ නොවී ඉතා පැහැදිලිව</strong> තිබිය යුතුය.</li>
                                <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> හොඳින් කියවිය හැකි විය යුතුය.</li>
                            </ul>
                            <div className="flex gap-2 md:gap-4">
                                <div className="flex-1 bg-black/20 backdrop-blur-xl border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={correctCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2" alt="Correct"/>
                                    <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                </div>
                                <div className="flex-1 bg-black/20 backdrop-blur-xl border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={wrongCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50" alt="Wrong"/>
                                    <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-black/20 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/20">
                            <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><MonitorPlay size={16}/> Bank Slip or e-Receipts</h4>
                            <ul className="text-xs md:text-sm text-white/70 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> අනිවාර්යයෙන්ම දිස්විය යුතුය.</li>
                                <li>Screenshot එක හෝ Slip එක කපා-කොටා (crop) නොමැතිව <strong className="text-white">සම්පූර්ණයෙන්ම</strong> උඩුගත කරන්න.</li>
                            </ul>
                             <div className="flex gap-2 md:gap-4">
                                <div className="flex-1 bg-black/20 backdrop-blur-xl border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={correctReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 border border-white/20" alt="Correct"/>
                                    <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                </div>
                                <div className="flex-1 bg-black/20 backdrop-blur-xl border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={wrongReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50 border border-white/20" alt="Wrong"/>
                                    <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-8 flex justify-end gap-3 md:gap-4">
                        <button onClick={() => setShowSlipInstructions(false)} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-black/20 backdrop-blur-xl text-white/70 font-medium text-xs md:text-sm font-bold hover:bg-black/20 backdrop-blur-xl hover:text-white transition-colors">අවලංගු කරන්න (Cancel)</button>
                        <button onClick={confirmSlipInstructions} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-red-600 text-white text-xs md:text-sm font-bold hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors">මම තේරුම් ගත්තා (Upload)</button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* 🔥 PAYCORP IFRAME POPUP 🔥 */}
        {paycorpIframeUrl && createPortal(
            <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-2 md:p-8">
                <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] md:h-full relative overflow-hidden flex flex-col shadow-2xl">
                    <div className="bg-[#1a1f2e] text-white p-3 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Wallet size={18} className="text-emerald-400" />
                            <h3 className="font-bold text-sm md:text-base">Sampath Bank Secure Payment</h3>
                        </div>
                        <button 
                            onClick={() => {
                                setPaycorpIframeUrl(null);
                                setIsSubmitting(false);
                                submitLock.current = false;
                            }} 
                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors"
                            title="Cancel Payment"
                        >
                            <X size={18}/>
                        </button>
                    </div>
                    <iframe 
                        src={paycorpIframeUrl} 
                        className="w-full flex-1 border-none bg-white" 
                        title="Sampath Payment Gateway"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                    />
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

export default EnrollmentTab;