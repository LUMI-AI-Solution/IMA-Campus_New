import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { FolderOpen, Folder, Trash2, XCircle, X,  
  Upload, CheckCircle, FileText, Activity, Loader, 
  ShieldCheck, Database, Search, Key, Lock, Plus, Calendar, 
  AlertCircle, Settings, KeyRound, Image, CheckSquare, Edit3, Terminal, Send, Bot, User,
  Zap, Play, StopCircle, History, Clock, Filter, RefreshCw, Eye, ExternalLink, Server, ChevronRight
 } from 'lucide-react';
import toast from 'react-hot-toast';
import AIHistoryTab from './AIHistoryTab';



const ScanningAnimation = ({ targetSlipConfig, banksConfig }) => {
    const selectedBankConfig = banksConfig.find(b => b.slips?.some(s => s.name === targetSlipConfig));
    const selectedSlipDef = selectedBankConfig?.slips.find(s => s.name === targetSlipConfig);
    const refImage = selectedSlipDef?.mediaUrl;

    const [extractionSteps, setExtractionSteps] = React.useState([]);

    React.useEffect(() => {
        const steps = [
            "Initializing Neural Network...",
            "Loading Template: " + (targetSlipConfig || 'Auto-Detect'),
            "Aligning corners & correcting perspective...",
            "Applying OCR to image sectors...",
            "Extracting Date [sector 1]...",
            "Found Date: [**/**/****]",
            "Extracting Amount [sector 2]...",
            "Found Amount: LKR [**,***.**]",
            "Extracting Transaction Reference...",
            "Found Ref: [*********]",
            "Cross-referencing with Bank Vault...",
            "Comparing against recent transactions...",
            "Match probability: 98.5%",
            "Verification successful."
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if(i < steps.length) {
                setExtractionSteps(prev => [...prev, steps[i]]);
                i++;
            } else {
                setExtractionSteps([]);
                i = 0;
            }
        }, 600);
        return () => clearInterval(interval);
    }, [targetSlipConfig]);

    return (
        <div className="absolute inset-0 z-50 bg-gray-950/95 backdrop-blur-xl flex flex-col rounded-2xl overflow-hidden border border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            {/* Header */}
            <div className="h-10 border-b border-blue-500/30 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 flex items-center px-4 shrink-0 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.2),transparent)] animate-[scan_2s_linear_infinite]"></div>
                <Activity className="text-emerald-400 animate-pulse mr-2" size={16} />
                <span className="text-emerald-300 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">Quantum Vision Engine</span>
                <div className="ml-auto flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" style={{animationDelay: '200ms'}}></span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" style={{animationDelay: '400ms'}}></span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row w-full flex-1 p-4 gap-4 relative">
                
                {/* Left: Image Scanner */}
                <div className="w-full sm:w-1/2 flex flex-col items-center justify-center relative bg-black/50 rounded-xl border border-blue-900/50 p-2 shrink-0 shadow-inner overflow-hidden group">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                    
                    <div className="text-emerald-400 font-mono text-[10px] mb-4 uppercase tracking-widest border border-emerald-500/30 px-3 py-1 rounded bg-cyan-950/30 flex items-center gap-2 relative z-10 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <Search size={12} className="animate-[spin_3s_linear_infinite]" /> 
                        TARGET: {targetSlipConfig || 'AUTO'}
                    </div>
                    
                    <div className="relative w-[80%] max-w-[200px] aspect-[4/3] border border-emerald-500/40 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-gray-900 flex items-center justify-center group-hover:border-emerald-400/80 transition-colors duration-500">
                        {refImage ? (
                            <img 
                                src={
                                    refImage.startsWith('http') 
                                    ? refImage 
                                    : (import.meta.env.VITE_API_URL
                                        ? import.meta.env.VITE_API_URL.replace('/api', '') + '/api' + refImage
                                        : (window.location.protocol === 'https:' ? `https://${window.location.hostname}` : `http://${window.location.hostname}:5000`) + '/api' + refImage)
                                } 
                                alt="Reference" className="w-full h-full object-cover opacity-70 mix-blend-screen filter contrast-125" 
                            />
                        ) : (
                            <div className="text-emerald-900 flex flex-col items-center gap-2">
                                <Image size={32} className="opacity-50" />
                                <span className="text-[10px] font-mono tracking-widest">AWAITING IMAGE</span>
                            </div>
                        )}
                        
                        {/* Advanced Scanner Lines */}
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-400 shadow-[0_0_20px_4px_rgba(16,185,129,1)] animate-[scan_2s_ease-in-out_infinite_alternate] z-20"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-[scan_2s_ease-in-out_infinite_alternate] z-10"></div>
                        
                        {/* Crosshairs */}
                        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 opacity-70"></div>
                        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 opacity-70"></div>
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 opacity-70"></div>
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 opacity-70"></div>
                    </div>
                </div>

                {/* Right: Data Extraction Terminal */}
                <div className="w-full sm:w-1/2 flex flex-col bg-black/80 border border-gray-800 rounded-xl overflow-hidden relative shadow-inner">
                    <div className="h-6 bg-gray-900 border-b border-gray-800 flex items-center px-3 shrink-0">
                        <Terminal size={10} className="text-gray-500 mr-2" />
                        <span className="text-gray-500 font-mono text-[9px] uppercase tracking-widest">Extraction Log</span>
                    </div>
                    <div className="flex-1 p-3 font-mono text-[10px] overflow-y-auto flex flex-col justify-end relative">
                        {/* Terminal Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent pointer-events-none z-10"></div>
                        <div className="space-y-1.5 relative z-20 w-full">
                            {extractionSteps.map((step, i) => (
                                <div key={i} className={`animate-[fadeIn_0.2s_ease-out] ${step.includes('Found') || step.includes('successful') ? 'text-emerald-400 font-bold drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : step.includes('Match') ? 'text-amber-400' : 'text-emerald-500'}`}>
                                    <span className="text-gray-600 mr-2">{'>'}</span> 
                                    {step}
                                </div>
                            ))}
                            <div className="animate-pulse text-emerald-500">
                                <span className="text-gray-600 mr-2">{'>'}</span> _
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan {
                    0% { top: -10%; }
                    100% { top: 110%; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
};

export default function AISlipVerification({ loggedInUser }) {
  // General State
  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isAutoVerifyEnabled, setIsAutoVerifyEnabled] = useState(false);
  
  // Pending Slips State
  const [pendingSlips, setPendingSlips] = useState([]);
  const [verificationCount, setVerificationCount] = useState(10);
  
  // Bank Statements State
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [newMonthName, setNewMonthName] = useState('');
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [statementFile, setStatementFile] = useState(null);
  const [statementBank, setStatementBank] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statementTransactions, setStatementTransactions] = useState([]);
  
  // Settings / Config Panel States
  const [showSettingsAuth, setShowSettingsAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPassword, setSettingsPassword] = useState('');
  const [isAuthenticatedSettings, setIsAuthenticatedSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Configuration State
  const [banksConfig, setBanksConfig] = useState([]);
  const [activeBank, setActiveBank] = useState('');
  const [activeSlips, setActiveSlips] = useState([]);
  const [selectedConfigBankIndex, setSelectedConfigBankIndex] = useState(0);
  const [newBankName, setNewBankName] = useState('');
  
  // Manual Transaction States
  const [showManualTxnModal, setShowManualTxnModal] = useState(false);
  const [manualTxnDate, setManualTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTxnDesc, setManualTxnDesc] = useState('');
  const [manualTxnAmount, setManualTxnAmount] = useState('');
  const [isAddingManualTxn, setIsAddingManualTxn] = useState(false);

  // Verification Animation State
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentVerifyingIndex, setCurrentVerifyingIndex] = useState(-1);
  const [currentVerifyingSlip, setCurrentVerifyingSlip] = useState(null);
  const [animStep, setAnimStep] = useState(0); // 1: Extract, 2: Query, 3: Match, 4: Done
  
  // Results State
  const [verifiedResults, setVerifiedResults] = useState([]);
  const [needsReviewResults, setNeedsReviewResults] = useState([]);

  // AI Command Console State
  const [commandText, setCommandText] = useState('');
  const [targetSlipConfig, setTargetSlipConfig] = useState('');
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandLogs, setCommandLogs] = useState([]);

  // Settings Tabs
  const [activeSettingsTab, setActiveSettingsTab] = useState('banks');
  const [mainTab, setMainTab] = useState('slips');
  const [bulkStatus, setBulkStatus] = useState({ isRunning: false, processed: 0, total: 0 });

  const [gsheetTree, setGsheetTree] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedSheetTab, setSelectedSheetTab] = useState('');

  useEffect(() => {
    fetchBusinesses();
    fetchMonths();
    fetchFullConfig();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchBatches(selectedBusiness);
    } else {
      setBatches([]);
      setSelectedBatch('');
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchPendingSlips();
  }, [selectedBusiness, selectedBatch, selectedStatus]);

  useEffect(() => {
    let interval;
    if (isAutoVerifyEnabled && !isVerifying) {
      interval = setInterval(() => {
        if (pendingSlips.length > 0 && targetSlipConfig && selectedMonth) {
          startBatchVerification();
        } else {
          fetchPendingSlips();
        }
      }, 15000); // Poll every 15 seconds
    }
    return () => clearInterval(interval);
  }, [isAutoVerifyEnabled, isVerifying, pendingSlips.length, targetSlipConfig, selectedMonth]);

  useEffect(() => {
      let interval;
      const pollBulkStatus = async () => {
          try {
              const { data } = await api.get('/api/ai-verification/bulk-status');
              setBulkStatus(data);
              if (data.isRunning) {
                  fetchPendingSlips();
              }
          } catch (error) {
              console.error("Error polling bulk status", error);
          }
      };

      if (mainTab === 'slips') {
          pollBulkStatus();
          interval = setInterval(pollBulkStatus, 2000);
      }
      return () => clearInterval(interval);
  }, [mainTab]);

  useEffect(() => {
    if (selectedMonth) fetchMonthTransactions(selectedMonth);
  }, [selectedMonth]);

  const fetchBusinesses = async () => {
    try {
      const res = await api.get('/admin/businesses');
      setBusinesses(Array.isArray(res.data) ? res.data : []);
    } catch (err) { toast.error("Failed to fetch businesses"); }
  };

  const fetchBatches = async (bizId) => {
    try {
      const res = await api.get(`/admin/batches/${bizId}`);
      setBatches(Array.isArray(res.data.batches) ? res.data.batches : []);
    } catch (err) { toast.error("Failed to fetch batches"); }
  };

  const fetchMonths = async () => {
    try {
      const res = await api.get('/ai-verification/months');
      setMonths(Array.isArray(res.data) ? res.data : []);
      if (res.data.length > 0 && !selectedMonth) {
        setSelectedMonth(res.data[0]);
      }
    } catch (err) { toast.error("Failed to fetch months"); }
  };

  const fetchPendingSlips = async () => {
    try {
      let url = '/ai-verification/pending-slips?includeApproved=true&';
      if (selectedBusiness) url += `businessId=${selectedBusiness}&`;
      if (selectedBatch) url += `batchId=${selectedBatch}&`;
      if (selectedStatus !== '') url += `status=${selectedStatus}&`;
      const res = await api.get(url);
      setPendingSlips(Array.isArray(res.data) ? res.data : []);
    } catch (err) { toast.error("Failed to fetch pending slips"); }
  };

  const fetchMonthTransactions = async (month) => {
    try {
      const res = await api.get(`/ai-verification/transactions?statementMonth=${month}`);
      if (res.data && res.data.rows) {
        setStatementTransactions(res.data.rows);
      } else {
        setStatementTransactions(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) { toast.error("Failed to fetch transactions"); }
  };

  // --- Settings & Config Panel Actions ---
  const handleAuthSettings = async () => {
    try {
      const res = await api.post('/ai-verification/verify-password', { password: settingsPassword });
      if (res.data.success) {
        setIsAuthenticatedSettings(true);
        setShowSettingsAuth(false);
        setShowSettings(true);
        setSettingsPassword('');
        fetchFullConfig();
      } else {
        toast.error("Invalid Security PIN");
      }
    } catch (err) {
      toast.error("Password authentication failed");
    }
  };

  const fetchFullConfig = async () => {
    try {
      const res = await api.get(`/ai-verification/config?t=${Date.now()}`);
      setApiKey(res.data.apiKey || '');
      setBanksConfig(Array.isArray(res.data.banks) ? res.data.banks : []);
      const settingsRes = await api.get(`/ai-verification/settings?t=${Date.now()}`);
      if (settingsRes.data.settings) {
        setActiveBank(settingsRes.data.settings.activeBank || '');
        setActiveSlips(Array.isArray(settingsRes.data.settings.activeSlips) ? settingsRes.data.settings.activeSlips : []);
      }
      try { const treeRes = await api.get('/ai-verification/gsheet-config/tree'); setGsheetTree(treeRes.data || {}); } catch(e){}
    } catch (err) {
      toast.error("Failed to load full configuration");
    }
  };

  const saveGsheetTree = async (tree) => {
    try {
      await api.post('/ai-verification/gsheet-config/tree', { tree });
      toast.success("G-Sheets Directory saved");
    } catch(e) {
      toast.error("Failed to save G-Sheets Directory");
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingKey(true);
    try {
      await api.post('/ai-verification/config', { 
        apiKey, 
        banks: banksConfig 
      });
      
      // Save active settings too
      await api.post('/ai-verification/settings-active', {
        activeBank,
        activeSlips
      });

      toast.success("AI Core Settings and Bank Configurations saved!");
      setShowSettings(false);
      setIsAuthenticatedSettings(false);
    } catch (err) {
      toast.error("Failed to save core configurations");
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleChangePIN = async () => {
    if (newPassword !== confirmPassword) {
      return toast.error("New PINs do not match");
    }
    try {
      await api.post('/ai-verification/change-password', {
        currentPassword,
        newPassword
      });
      toast.success("Security PIN changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update security PIN");
    }
  };

  // --- Config Editor Helpers ---
  const handleAddBank = () => {
    if (!newBankName.trim()) return toast.error("Please enter a bank name");
    if (banksConfig.some(b => b.bankName.toLowerCase() === newBankName.trim().toLowerCase())) {
      return toast.error("Bank already exists");
    }
    const updated = [...banksConfig, { bankName: newBankName.trim(), slips: [] }];
    setBanksConfig(updated);
    setSelectedConfigBankIndex(updated.length - 1);
    setNewBankName('');
  };

  const handleDeleteBank = (index) => {
    const updated = banksConfig.filter((_, i) => i !== index);
    setBanksConfig(updated);
    setSelectedConfigBankIndex(Math.max(0, index - 1));
  };

  const handleAddSlipType = (bankIndex) => {
    const targetBank = banksConfig[bankIndex];
    const newSlipName = prompt("Enter Slip Type Name (e.g. CDM, Online Transfer):");
    if (newSlipName) {
      const updated = [...banksConfig];
      updated[bankIndex] = {
        ...targetBank,
        slips: [...(targetBank.slips || []), { name: newSlipName, slip_image: '', rules: '' }]
      };
      setBanksConfig(updated);
    }
  };

  const handleAddCustomColumn = (bankIndex) => {
    const updated = [...banksConfig];
    if (!updated[bankIndex].customColumns) updated[bankIndex].customColumns = [];
    updated[bankIndex].customColumns.push({ name: '', isCurrency: false });
    setBanksConfig(updated);
  };

  const handleUpdateCustomColumn = (bankIndex, colIndex, field, value) => {
    const updated = [...banksConfig];
    updated[bankIndex].customColumns[colIndex][field] = value;
    setBanksConfig(updated);
  };

  const handleRemoveCustomColumn = (bankIndex, colIndex) => {
    const updated = [...banksConfig];
    updated[bankIndex].customColumns.splice(colIndex, 1);
    setBanksConfig(updated);
  };

  const handleDeleteSlipType = (bankIndex, slipIndex) => {
    const updated = [...banksConfig];
    updated[bankIndex].slips = updated[bankIndex].slips.filter((_, i) => i !== slipIndex);
    setBanksConfig(updated);
  };

  const handleUpdateSlipType = (bankIndex, slipIndex, key, value) => {
    const updated = [...banksConfig];
    updated[bankIndex].slips[slipIndex][key] = value;
    setBanksConfig(updated);
  };

  const handleUploadRefSlipImage = async (bankIndex, slipIndex, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('refSlipFile', file);
    
    const toastId = toast.loading("Uploading reference slip...");
    try {
      const res = await api.post('/ai-verification/upload-ref-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleUpdateSlipType(bankIndex, slipIndex, 'mediaUrl', res.data.fileUrl);
      toast.success("Reference slip uploaded!", { id: toastId });
    } catch (err) {
      toast.error("Reference slip upload failed", { id: toastId });
    }
  };

  // --- Bank Statement Upload & Manual Entries ---
  const handleCreateMonth = () => {
    if (!newMonthName) return toast.error("Month name required (e.g. June 2026)");
    setMonths([newMonthName, ...months]);
    setSelectedMonth(newMonthName);
    setNewMonthName('');
    setShowNewMonthModal(false);
  };

  const handleClearTable = async () => {
      if (!selectedMonth) return toast.error("Please select a target month to clear.");
      if (!window.confirm(`Are you sure you want to clear all imported bank statements for ${selectedMonth}?`)) return;

      try {
          await api.delete(`/ai-verification/bank-statements/${selectedMonth}`);
          toast.success("Successfully cleared statements.");
          fetchMonthTransactions(selectedMonth);
      } catch (err) {
          console.error(err);
          toast.error("Failed to clear statements.");
      }
  };

  const handleUploadStatement = async () => {
    if (!statementFile) return toast.error("Please select an Excel/CSV file");
    if (!selectedFolder) return toast.error("Please select a Bank Template");

    const formData = new FormData();
    formData.append('statementFile', statementFile);
    formData.append('month', selectedMonth);
    formData.append('bankName', selectedFolder);
    
    setIsUploading(true);
    try {
      const res = await api.post('/ai-verification/upload-bank-statement', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      setStatementFile(null);
      document.getElementById('bank-upload').value = '';
      fetchMonthTransactions(selectedMonth);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddManualTransaction = async () => {
    if (!manualTxnDate || !manualTxnDesc.trim() || !manualTxnAmount || !selectedMonth) {
      return toast.error("All manual transaction fields are required");
    }
    setIsAddingManualTxn(true);
    try {
      await api.post('/ai-verification/add-manual-transaction', {
        txnDate: manualTxnDate,
        description: manualTxnDesc.trim(),
        amount: parseFloat(manualTxnAmount),
        statementMonth: selectedMonth
      });
      toast.success("Transaction recorded successfully!");
      setShowManualTxnModal(false);
      setManualTxnDesc('');
      setManualTxnAmount('');
      fetchMonthTransactions(selectedMonth);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add transaction record");
    } finally {
      setIsAddingManualTxn(false);
    }
  };

  // --- AI Verification Logic ---
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Verify single slip by payment ID
  const verifySingleSlip = async (slip) => {
    if (!selectedMonth) return toast.error("Please select a target Month for bank statements");
    if (!targetSlipConfig) return toast.error("Please select a Target Slip Template first.");

    setIsVerifying(true);
    setCurrentVerifyingIndex(0);
    setCurrentVerifyingSlip(slip);
    setAnimStep(1); // Scan image

    const selectedBankConfig = banksConfig.find(b => b.slips?.some(s => s.name === targetSlipConfig));
    if (selectedBankConfig) {
      try {
        await api.post('/ai-verification/settings-active', {
          activeBank: selectedBankConfig.bankName,
          activeSlips: [targetSlipConfig]
        });
      } catch(e) {
          console.error("Failed to update active settings", e);
          setIsVerifying(false);
          setAnimStep(0);
          return toast.error("Failed to set active bank template. Check network.");
      }
    }
    await sleep(1200);
    setAnimStep(2); // Query DB
    await sleep(900);
    setAnimStep(3); // Match transactions
    
    try {
      const res = await api.post('/ai-verification/verify-single', {
        paymentId: slip.id,
        statementMonth: selectedMonth
      });
      
      setAnimStep(4); // Match results ready
      await sleep(1000);
      
      const result = res.data;
      if (result.success) {
        toast.success(`Slip #${slip.id} matched and verified!`);
        setVerifiedResults(prev => [{ slip, ...result }, ...prev]);
      } else {
        toast.error(`Auto match failed for slip #${slip.id}. Manual review required.`);
        setNeedsReviewResults(prev => [{ slip, ...result }, ...prev]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `AI processing failed for slip #${slip.id}`);
      setNeedsReviewResults(prev => [{ slip, status: 'ERROR', confidence: 0, matchMethod: 'Error executing AI process' }, ...prev]);
    } finally {
      setIsVerifying(false);
      setCurrentVerifyingIndex(-1);
      setCurrentVerifyingSlip(null);
      setAnimStep(0);
      fetchPendingSlips();
      fetchMonthTransactions(selectedMonth);
    }
  };
  const handleExecuteCommand = async () => {
    if (!commandText.trim()) return;
    if (!targetSlipConfig) return toast.error("Please select a Target Slip Template first.");

    const cmd = commandText.trim();
    setCommandText('');
    setCommandLogs(prev => [...prev, { role: 'user', text: cmd }]);
    setIsExecutingCommand(true);

    try {
      const res = await api.post('/ai-verification/execute-command', {
        command: cmd,
        exampleSlipConfigName: targetSlipConfig,
        pendingPaymentIds: pendingSlips.map(s => s.id),
        statementMonth: selectedMonth
      });

      setCommandLogs(prev => [...prev, { role: 'ai', text: res.data.message }]);

      if (res.data.action === 'FILTERED') {
        const filtered = pendingSlips.filter(s => res.data.matchedPaymentIds.includes(s.id));
        setPendingSlips(filtered);
        toast.success(`Filtered ${filtered.length} slips matching the template.`);
      } else if (res.data.action === 'VERIFY') {
        setVerificationCount(res.data.count);
        setTimeout(() => startBatchVerification(), 500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Error executing command. Please try again.';
      setCommandLogs(prev => [...prev, { role: 'error', text: `❌ ${errorMsg}` }]);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Verify batch of slips sequentially
  const startBatchVerification = async () => {
    if (!selectedMonth) return toast.error("Please select a target Month for bank statements");
    if (pendingSlips.length === 0) return toast.error("No pending slips to verify");
    if (verificationCount < 1) return toast.error("Count must be at least 1");
    if (!targetSlipConfig) return toast.error("Please select a Target Slip Template first.");

    setIsVerifying(true);

    const selectedBankConfig = banksConfig.find(b => b.slips?.some(s => s.name === targetSlipConfig));
    if (selectedBankConfig) {
      try {
        await api.post('/ai-verification/settings-active', {
          activeBank: selectedBankConfig.bankName,
          activeSlips: [targetSlipConfig]
        });
      } catch(e) {
          console.error("Failed to update active settings", e);
          setIsVerifying(false);
          return toast.error("Failed to set active bank template. Check network.");
      }
    }

    const slipsToVerify = pendingSlips.slice(0, verificationCount);
    
    for (let i = 0; i < slipsToVerify.length; i++) {
        const slip = slipsToVerify[i];
        setCurrentVerifyingIndex(i);
        setCurrentVerifyingSlip(slip);
        
        setAnimStep(1); 
        await sleep(1000);
        setAnimStep(2); 
        await sleep(800);
        setAnimStep(3); 
        
        try {
            const res = await api.post('/ai-verification/process-verification', {
                paymentIds: [slip.id],
                statementMonth: selectedMonth
            });
            
            setAnimStep(4);
            await sleep(800);
            
            const result = res.data.results[0] || res.data;
            result.slip = slip;
            
            if (result.status === 'VERIFIED') {
                setVerifiedResults(prev => [result, ...prev]);
            } else {
                setNeedsReviewResults(prev => [result, ...prev]);
            }
        } catch (err) {
            toast.error(`Verification failed for slip #${slip.id}`);
            setNeedsReviewResults(prev => [{ slip, status: 'ERROR', confidence: 0 }, ...prev]);
        }
    }
    
    setIsVerifying(false);
    setCurrentVerifyingIndex(-1);
    setCurrentVerifyingSlip(null);
    setAnimStep(0);
    toast.success("Batch verification completed!");
    fetchPendingSlips();
    fetchMonthTransactions(selectedMonth);
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] overflow-y-auto font-sans bg-black/30 text-gray-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-500 animate-pulse" size={28} /> AI Slip Verification Center
          </h1>
          <p className="text-gray-400 text-sm">Targeted verification sequence for pending deposits</p>
        </div>
        
        <div className="flex items-center gap-4">
            <select 
              value={selectedBusiness} 
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
            >
              <option value="">All Businesses</option>
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            
            <select 
              value={selectedBatch} 
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
            >
              <option value="">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="0">Pending</option>
              <option value="1">Approved</option>
              <option value="2">Rejected</option>
            </select>

            <button 
                onClick={() => setShowSettingsAuth(true)}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-emerald-400 hover:text-emerald-300 rounded-lg transition"
                title="AI Core Settings & Bank Configuration"
            >
                <Settings size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-12">
            <div className="flex gap-4 mb-6 border-b border-gray-800 pb-2">
                <button onClick={() => setMainTab('slips')} className={`pb-2 px-6 font-bold text-lg transition-colors ${mainTab==='slips' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Activity className="inline mr-2 mb-1" size={20}/>Collected Slips
                </button>
                <button onClick={() => setMainTab('vault')} className={`pb-2 px-6 font-bold text-lg transition-colors ${mainTab==='vault' ? 'text-emerald-400 border-b-4 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Database className="inline mr-2 mb-1" size={20}/>Google Sheet Vault
                </button>
                <button onClick={() => setMainTab('history')} className={`pb-2 px-6 font-bold text-lg transition-colors ${mainTab==='history' ? 'text-purple-400 border-b-4 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    <History className="inline mr-2 mb-1" size={20}/>Schedule History
                </button>
            </div>
        </div>

        {mainTab === 'history' && (
            <div className="lg:col-span-12">
                <AIHistoryTab api={api} />
            </div>
        )}

        {mainTab === 'slips' && (
        <>
        <div className="lg:col-span-12 flex flex-col gap-6">
            {/* BULK VERIFICATION DASHBOARD */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                {bulkStatus?.isRunning && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                        <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-500" style={{width: `${(bulkStatus.processed / bulkStatus.total) * 100}%`}}></div>
                    </div>
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <Zap className="text-emerald-400" size={24} /> AI Bulk Verification
                        </h3>
                        <p className="text-sm text-gray-400">
                            Run automated verification on all pending slips in the background. The AI will cross-reference extracted slip data against the selected bank statement month.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                        <div className="text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</p>
                            <span className={`font-bold px-3 py-1 rounded-md text-sm ${bulkStatus?.isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-700 text-gray-300'}`}>
                                {bulkStatus?.isRunning ? 'RUNNING' : 'IDLE'}
                            </span>
                        </div>
                        <div className="w-px h-10 bg-gray-700 mx-2"></div>
                        <div className="text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Progress</p>
                            <p className="text-xl font-bold text-white">{bulkStatus?.processed || 0} <span className="text-sm text-gray-500">/ {bulkStatus?.total || 0}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Errors</p>
                            <p className="text-xl font-bold text-red-400">{bulkStatus?.errors || 0}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {!bulkStatus?.isRunning ? (
                            <button 
                                onClick={async () => {
                                    if(!selectedMonth) return toast.error("Please select a target statement month in the Right Panel");
                                    try {
                                        await api.post('/api/ai-verification/bulk-start', { month: selectedMonth });
                                        toast.success("Bulk AI Verification Started");
                                    } catch(e) {
                                        toast.error("Failed to start bulk run");
                                    }
                                }}
                                disabled={pendingSlips.length === 0}
                                className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition shadow-lg ${pendingSlips.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 hover:shadow-emerald-500/40'}`}
                            >
                                <Play size={20} /> Start Bulk Run
                            </button>
                        ) : (
                            <button 
                                onClick={async () => {
                                    try {
                                        await api.post('/api/ai-verification/bulk-stop');
                                        toast.success("Bulk Run Stopped");
                                    } catch(e) {
                                        toast.error("Failed to stop");
                                    }
                                }}
                                className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 hover:shadow-red-500/40"
                            >
                                <StopCircle size={20} /> Stop Run
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="text-blue-500" size={20} /> Collected Slips 
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">{pendingSlips.length}</span>
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Verify N:</span>
                        <input 
                            type="number" 
                            min="1" 
                            value={verificationCount} 
                            onChange={(e) => setVerificationCount(parseInt(e.target.value) || 1)}
                            className="w-16 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-center outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center mb-4">
                    <div className="w-full sm:w-1/3">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Auto AI Verification</label>
                        <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-700 px-3 py-2 rounded-lg">
                            <button 
                                onClick={() => setIsAutoVerifyEnabled(!isAutoVerifyEnabled)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isAutoVerifyEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isAutoVerifyEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                            </button>
                            <span className={`text-sm font-semibold ${isAutoVerifyEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                                {isAutoVerifyEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                        </div>
                    </div>
                    <div className="w-full sm:w-1/3">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Target Slip Template</label>
                        <select 
                            value={targetSlipConfig}
                            onChange={(e) => setTargetSlipConfig(e.target.value)}
                            className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                        >
                            <option value="">-- Select Template --</option>
                            {banksConfig.flatMap(b => b.slips?.map(s => <option key={s.name} value={s.name}>{b.bankName} - {s.name}</option>))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={startBatchVerification}
                        disabled={isVerifying || pendingSlips.length === 0 || !targetSlipConfig}
                        className={`w-full sm:w-1/3 py-3 mt-4 sm:mt-5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${isVerifying ? 'bg-blue-900/50 border border-blue-500/30' : pendingSlips.length === 0 || !targetSlipConfig ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`}
                    >
                        {isVerifying ? (
                            <><Loader className="animate-spin" size={20} /> AI Verification Sequence Active...</>
                        ) : (
                            <><Search size={20} /> Verify Selected Slips</>
                        )}
                    </button>
                </div>

                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                        <thead className="bg-gray-900 border-b border-gray-700 font-medium text-gray-400 text-[11px] uppercase tracking-wider sticky top-0 z-20">
                            <tr>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actioned By / Remark</th>
                                <th className="px-4 py-3">Slip ID & Amount</th>
                                <th className="px-4 py-3">Student Name</th>
                                <th className="px-4 py-3 text-center">Ref Image</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {pendingSlips.map((slip, idx) => {
                                const isCurrent = isVerifying && currentVerifyingSlip?.id === slip.id;
                                const isProcessed = isVerifying && idx < currentVerifyingIndex;
                                
                                return (
                                    <tr key={slip.id} className={`transition-all duration-300 hover:bg-gray-800/40 ${isCurrent ? 'bg-blue-900/20 shadow-[inset_4px_0_0_rgba(59,130,246,1)]' : isProcessed ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            {slip.status === 1 ? (
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">Approved</span>
                                            ) : slip.status === 2 ? (
                                                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-semibold">Rejected</span>
                                            ) : (
                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-semibold flex items-center gap-1 w-max">
                                                    {isCurrent && <Loader size={10} className="animate-spin" />}
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-gray-300 flex items-center gap-1">
                                                    {slip.actionedBy ? <><User size={12}/> {slip.actionedBy.firstName || 'Staff'}</> : slip.remark?.startsWith('AI') ? <><Bot size={12} className="text-blue-400"/> AI System</> : <span className="text-gray-600">-</span>}
                                                </span>
                                                {slip.remark && <span className="text-[10px] text-amber-400/80 max-w-[200px] truncate" title={slip.remark}>{slip.remark}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-white font-semibold">#{slip.id}</span>
                                                <span className="text-emerald-400 font-medium text-xs">LKR {slip.amount.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            {slip.student?.firstName} {slip.student?.lastName}
                                            <div className="text-[10px] text-gray-500">{new Date(slip.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="w-10 h-10 rounded bg-gray-900 border border-gray-700 overflow-hidden mx-auto relative group cursor-pointer hover:scale-[3] hover:z-50 hover:shadow-2xl transition-transform origin-center">
                                                {slip.slip_image ? (
                                                    <img
                                                        src={
                                                            import.meta.env.VITE_API_URL
                                                                ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image.split(',')[0]}`
                                                                : (window.location.protocol === 'https:' ? `https://${window.location.hostname}` : `http://${window.location.hostname}:5000`) + `/api/storage/documents/${slip.slip_image.split(',')[0]}`
                                                        }
                                                        alt="slip"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.src = '/logo.png'; }}
                                                    />
                                                ) : <FileText size={16} className="text-gray-600 mx-auto mt-2"/>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => verifySingleSlip(slip)}
                                                disabled={isVerifying}
                                                className="text-xs bg-blue-600/80 hover:bg-blue-600 text-white font-medium px-3 py-1.5 rounded transition disabled:bg-gray-800 disabled:text-gray-600"
                                            >
                                                AI Verify
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {pendingSlips.length === 0 && (
                        <div className="text-center p-8 text-gray-500">No pending slips for selected filters.</div>
                    )}
                </div>
            </div>
        </div>
        </>
        )}

        {mainTab === 'vault' && (
        /* BOTTOM PANEL: BANK STATEMENT VAULT */
        <div className="lg:col-span-12 flex flex-col gap-6 mt-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Database className="text-emerald-500 animate-pulse" size={20} /> Bank Statement Vault
                    </h2>
                    
                    <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setShowManualTxnModal(true)}
                          className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-emerald-400 px-3 py-1.5 rounded-lg border border-gray-700 transition"
                      >
                          <Plus size={14} /> Manual Deposit
                      </button>
                      <button 
                          onClick={() => setShowNewMonthModal(true)}
                          className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-gray-700 transition"
                      >
                          <Plus size={14} /> New Month
                      </button>
                    </div>
                </div>

                {/* Vault Folders */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mb-4 border-b border-gray-800">
                    {Object.keys(gsheetTree).length > 0 ? Object.keys(gsheetTree).map(folder => (
                        <button 
                            key={folder}
                            onClick={() => { setSelectedFolder(folder); setSelectedMonth(''); setStatementTransactions([]); setSelectedSheetTab(''); }}
                            className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors border-b-2 ${selectedFolder === folder ? 'bg-gray-800 text-emerald-400 border-emerald-500' : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'}`}
                        >
                            <Folder size={14} className="inline mr-2 mb-0.5" />{folder}
                        </button>
                    )) : (
                        <div className="text-sm text-gray-500 py-2">No folders configured. Create one below.</div>
                    )}
                    
                    {/* Add Folder Inline */}
                    <div className="flex items-center gap-2 ml-4">
                        <input type="text" placeholder="New Folder..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1.5 rounded outline-none" />
                        <button onClick={() => {
                            if(!newFolderName.trim()) return toast.error("Folder name required");
                            const t = {...gsheetTree};
                            if(t[newFolderName]) return toast.error("Folder already exists");
                            t[newFolderName] = {};
                            setGsheetTree(t); saveGsheetTree(t); setNewFolderName('');
                            setSelectedFolder(newFolderName);
                        }} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded"><Plus size={14}/></button>
                    </div>
                </div>

                {/* Months (If Folder Selected) */}
                {selectedFolder && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mb-4">
                        {Object.keys(gsheetTree[selectedFolder] || {}).map(m => (
                            <button 
                                key={m}
                                onClick={() => { setSelectedMonth(m); fetchMonthTransactions(m); setSelectedSheetTab(''); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedMonth === m ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            >
                                <Calendar size={14} className="inline mr-2 mb-0.5" />{m}
                            </button>
                        ))}
                        
                        {/* Add Month Inline */}
                        <div className="flex items-center gap-2 ml-4 border-l border-gray-700 pl-4">
                            <input type="text" placeholder="New Month..." value={newMonthName} onChange={e => setNewMonthName(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1.5 rounded outline-none" />
                            <button onClick={() => {
                                if(!newMonthName.trim()) return toast.error("Month required");
                                const t = {...gsheetTree};
                                if(t[selectedFolder][newMonthName]) return toast.error("Month exists");
                                t[selectedFolder][newMonthName] = [];
                                setGsheetTree(t); saveGsheetTree(t); setNewMonthName('');
                                setSelectedMonth(newMonthName);
                            }} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded"><Plus size={14}/></button>
                            
                            <button onClick={() => {
                                if(window.confirm("Delete folder and all its months?")) {
                                    const t = {...gsheetTree}; delete t[selectedFolder];
                                    setGsheetTree(t); saveGsheetTree(t); setSelectedFolder(null); setSelectedMonth('');
                                }
                            }} className="ml-4 text-xs text-red-500 hover:text-red-400 flex items-center"><Trash2 size={12} className="mr-1"/> Delete Folder</button>
                        </div>
                    </div>
                )}

                {/* Upload & Table Area */}
                {selectedMonth && selectedFolder && (
                    <div className="flex-1 flex flex-col min-h-0 bg-black/30 border border-gray-800 rounded-xl p-4">
                        
                        {/* GSheet Link Config for this Month */}
                        <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-800 mb-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-400 font-medium text-sm flex items-center gap-2">
                                    <Database size={14}/> Google Sheet Links for {selectedFolder} / {selectedMonth}
                                </span>
                                <button onClick={() => {
                                    if(window.confirm("Delete this month?")) {
                                        const t = {...gsheetTree}; delete t[selectedFolder][selectedMonth];
                                        setGsheetTree(t); saveGsheetTree(t); setSelectedMonth('');
                                    }
                                }} className="text-xs text-red-500 hover:text-red-400 flex items-center"><Trash2 size={12} className="mr-1" /> Delete Month</button>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                {(gsheetTree[selectedFolder][selectedMonth] || []).map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input type="text" value={link} readOnly className="flex-1 bg-gray-950 border border-gray-700 text-gray-400 text-xs rounded px-3 py-1.5" />
                                        <button onClick={() => {
                                            const t = {...gsheetTree}; t[selectedFolder][selectedMonth].splice(idx, 1);
                                            setGsheetTree(t); saveGsheetTree(t); fetchMonthTransactions(selectedMonth);
                                        }} className="text-red-500 hover:text-red-400"><XCircle size={16}/></button>
                                    </div>
                                ))}
                                <input 
                                    type="text" placeholder="Paste Google Sheet URL and press Enter..." 
                                    className="w-full bg-gray-800 border border-emerald-900/50 text-white text-xs rounded px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && e.target.value.trim()) {
                                            let val = e.target.value.trim();
                                            let sheetId = val;
                                            const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                                            if(match) sheetId = match[1];
                                            const t = {...gsheetTree};
                                            if(!t[selectedFolder][selectedMonth]) t[selectedFolder][selectedMonth] = [];
                                            t[selectedFolder][selectedMonth].push(sheetId);
                                            setGsheetTree(t); 
                                            e.target.value = '';
                                            saveGsheetTree(t).then(() => {
                                                fetchMonthTransactions(selectedMonth);
                                            });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4 w-full">
                            {/* Sheet Tabs */}
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar flex-1">
                                {(() => {
                                    const sheets = [...new Set(statementTransactions.map(t => t._sheetName || 'Sheet1'))];
                                    if (sheets.length > 0 && !selectedSheetTab && statementTransactions.length > 0) {
                                        setTimeout(() => setSelectedSheetTab(sheets[0]), 0);
                                    }
                                    return sheets.map(sheet => (
                                        <button 
                                            key={sheet}
                                            onClick={() => setSelectedSheetTab(sheet)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors border ${selectedSheetTab === sheet ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'}`}
                                        >
                                            <Database size={12} className="inline mr-1 mb-0.5" />{sheet}
                                        </button>
                                    ));
                                })()}
                            </div>

                            {/* Old Excel Import Fallback */}
                            <div className="flex items-center gap-2 shrink-0 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest px-2 font-bold">Fallback CSV</span>
                                <input type="file" id="bank-upload" accept=".csv, .xlsx, .xls" className="hidden" onChange={(e) => setStatementFile(e.target.files[0])} />
                                <label htmlFor="bank-upload" className="cursor-pointer text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-700 flex items-center gap-1 transition">
                                    <Upload size={12} /> {statementFile ? "Selected" : "Select"}
                                </label>
                                <button onClick={handleUploadStatement} disabled={!statementFile || isUploading} className={`text-[10px] px-2 py-1 rounded font-medium flex items-center gap-1 transition ${!statementFile ? 'bg-gray-800 text-gray-600' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                                    {isUploading ? <Loader size={12} className="animate-spin" /> : "Import"}
                                </button>
                                <button onClick={handleClearTable} className="text-[10px] px-2 py-1 rounded font-medium bg-red-900/30 text-red-400 hover:bg-red-800/50 border border-red-900/50 transition">Clear Table</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-gray-950/60 border border-gray-800 rounded-lg shadow-inner">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-[10px] text-gray-400 bg-gray-900/90 uppercase tracking-widest sticky top-0 shadow-sm z-10 border-b border-gray-800">
                                    <tr>
                                        {(() => {
                                            const activeConf = banksConfig.find(b => b.bankName === selectedFolder) || {};
                                            const cCols = activeConf.customColumns || [];
                                            return (
                                                <>
                                                    <th className="px-4 py-3">{activeConf.excelDateCol || 'Date'}</th>
                                                    {cCols.length > 0 ? (
                                                        cCols.map((c, i) => <th key={i} className="px-4 py-3">{c.name}</th>)
                                                    ) : (
                                                        <th className="px-4 py-3">{activeConf.excelDescCol || 'Description'}</th>
                                                    )}
                                                    <th className="px-4 py-3 text-right">{activeConf.excelAmountCol || 'Amount'} (LKR)</th>
                                                    <th className="px-4 py-3 text-center">Status</th>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                </thead>
                                <tbody>
                                    {statementTransactions.filter(t => (t._sheetName || 'Sheet1') === selectedSheetTab).map((txn) => {
                                        const activeConf = banksConfig.find(b => b.bankName === selectedFolder) || {};
                                        const cCols = activeConf.customColumns || [];
                                        
                                        let parsedDesc = null;
                                        try { parsedDesc = JSON.parse(txn.description); } catch(e) {}

                                        return (
                                        <tr key={txn.id || Math.random()} className={`border-b border-gray-800/30 hover:bg-gray-800/50 transition-colors ${txn.isMatched ? 'opacity-50 bg-gray-900/40' : ''}`}>
                                            <td className="px-4 py-3 whitespace-nowrap">{txn.txnDate ? new Date(txn.txnDate).toLocaleDateString() : '-'}</td>
                                            
                                            {cCols.length > 0 ? (
                                                cCols.map((c, i) => (
                                                    <td key={i} className="px-4 py-3 max-w-[150px] truncate" title={parsedDesc ? parsedDesc[c.name] : ''}>
                                                        {parsedDesc && parsedDesc[c.name] ? (c.isCurrency ? `Rs. ${parsedDesc[c.name]}` : parsedDesc[c.name]) : '-'}
                                                    </td>
                                                ))
                                            ) : (
                                                <td className="px-4 py-3 max-w-[200px] truncate" title={parsedDesc && parsedDesc['Description'] ? parsedDesc['Description'] : txn.description}>
                                                    {parsedDesc && parsedDesc['Description'] ? parsedDesc['Description'] : txn.description}
                                                </td>
                                            )}

                                            <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">{txn.amount ? txn.amount.toLocaleString() : '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {txn.isMatched ? (
                                                    <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-700 tracking-wider">MATCHED</span>
                                                ) : (
                                                    <span className="text-[10px] bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.1)]">OPEN</span>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {statementTransactions.filter(t => (t._sheetName || 'Sheet1') === selectedSheetTab).length === 0 && (
                                        <tr>
                                            <td colSpan="10" className="text-center py-12 text-gray-500 flex flex-col items-center justify-center">
                                                <Database size={24} className="mb-2 opacity-50" />
                                                <span className="text-sm">No records found in {selectedSheetTab || 'this sheet'}.</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
        )}

      {/* RESULTS SECTION */}


      {/* VERIFICATION ANIMATION OVERLAY - DIGITAL ARMY PLANNING BOARD */}
      {/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}
      </div></div></div></div></div>); }