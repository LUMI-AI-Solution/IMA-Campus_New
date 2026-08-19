import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FolderOpen, Layers, BookOpen, Plus, ChevronRight, ArrowLeft, Building2, MonitorPlay, MessageSquare, Send, CreditCard, FolderPlus, Users } from 'lucide-react';
import api from '../../../api/axios'; 
import ContentHubViews from './ContentHubViews';
import ContentHubModals from './ContentHubModals';

export default function ContentHub() {
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const userRole = storedUser.role ? storedUser.role.toUpperCase().replace(/[\s_-]+/g, '_') : 'STAFF'; 

  const isSystemAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const isManager = ['MANAGER', 'ASS_MANAGER', 'SUPER', 'SUPERVISOR', 'PHYSICAL_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'CALL_CENTER_SUPERVISOR'].includes(userRole) || userRole.includes('MANAG');
  const isStaff = userRole === 'COORDINATOR' || userRole === 'STAFF';

  const canManageBusiness = isSystemAdmin;
  const canManageBatches = isSystemAdmin || isManager;
  const canManageGroupsAndSubjects = isSystemAdmin || isManager;
  const canManageContent = isSystemAdmin || isManager;

  const [viewLevel, setViewLevel] = useState('businesses'); 
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchTab, setBatchTab] = useState('subjects'); 
  const [activeSubject, setActiveSubject] = useState(null);
  const [contentTab, setContentTab] = useState('live'); 

  const [businesses, setBusinesses] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [batches, setBatches] = useState([]); 
  const [uniqueSubjects, setUniqueSubjects] = useState([]);
  const [lessonGroups, setLessonGroups] = useState([]); 
  const [subjectContents, setSubjectContents] = useState([]);
  
  const [postsList, setPostsList] = useState([]); 

  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLecturerModal, setShowLecturerModal] = useState(false);
  const [showLessonGroupModal, setShowLessonGroupModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false); 
  const [showManagePostsModal, setShowManagePostsModal] = useState(false); 
  
  const [previewData, setPreviewData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedLogoName, setSelectedLogoName] = useState(""); 
  
  const [selectedGroupPrices, setSelectedGroupPrices] = useState({}); 
  const [discountRules, setDiscountRules] = useState([{ courseCount: '', pricePerCourse: '' }]); 
  const [contentType, setContentType] = useState('');
  const [prefilledFolder, setPrefilledFolder] = useState('');
  
  const [selectedBatchesForContent, setSelectedBatchesForContent] = useState([]);
  const [massAssignSubjects, setMassAssignSubjects] = useState([]);
  const [masterTutes, setMasterTutes] = useState([]);
  const [hubBatchConfigs, setHubBatchConfigs] = useState({});
  const [hubActiveBatchTab, setHubActiveBatchTab] = useState(null);
  const [openFolders, setOpenFolders] = useState({});

  const [postBizId, setPostBizId] = useState('all');
  const [postBatches, setPostBatches] = useState([]);

  useEffect(() => {
    if (postBizId === 'all' || !postBizId) { setPostBatches([]); return; }
    if (!isSystemAdmin) { setPostBatches(batches); return; }
    api.get(`/admin/batches/${postBizId}?t=${Date.now()}`).then(res => {
        const fetched = res.data.batches || res.data || [];
        setPostBatches(Array.isArray(fetched) ? fetched : []);
    }).catch(e => console.error(e));
  }, [postBizId, isSystemAdmin, batches]);

  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [existingInstallments, setExistingInstallments] = useState([]);
  const [editInstallmentId, setEditInstallmentId] = useState(null);
  const [installmentSubjectCount, setInstallmentSubjectCount] = useState('');
  const [installmentSteps, setInstallmentSteps] = useState([{ step: 1, amount: '', gapDays: '0' }]);

  const toggleFolder = (folderId) => setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  const addDiscountRule = () => setDiscountRules([...discountRules, { courseCount: '', pricePerCourse: '' }]);
  const removeDiscountRule = (index) => setDiscountRules(discountRules.filter((_, i) => i !== index));
  const handleDiscountRuleChange = (index, field, value) => { const newRules = [...discountRules]; newRules[index][field] = value; setDiscountRules(newRules); };
  
  const addInstallmentStep = () => setInstallmentSteps([...installmentSteps, { step: installmentSteps.length + 1, amount: '', gapDays: '30' }]);
  const removeInstallmentStep = (idx) => {
      const newSteps = installmentSteps.filter((_, i) => i !== idx);
      setInstallmentSteps(newSteps.map((s, i) => ({...s, step: i + 1})));
  };

  const toggleGroupPrice = (groupId) => {
      setSelectedGroupPrices(prev => {
          if (prev[groupId] !== undefined) { const newPrices = { ...prev }; delete newPrices[groupId]; return newPrices; }
          return { ...prev, [groupId]: { price: '', deliverTute: false, tuteName: '', tuteFile: null } };
      });
  };

  const updateGroupData = (groupId, field, value) => {
      setSelectedGroupPrices(prev => ({
          ...prev,
          [groupId]: { ...prev[groupId], [field]: value }
      }));
  };

  const toggleMassAssignSubject = (subId) => setMassAssignSubjects(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);

  const extractArray = (resData) => {
      if (!resData) return [];
      if (Array.isArray(resData)) return resData;
      if (Array.isArray(resData.data)) return resData.data;
      if (Array.isArray(resData.businesses)) return resData.businesses;
      if (Array.isArray(resData.staff)) return resData.staff;
      return [];
  };

  const fetchInitialData = async () => {
      setLoading(true);
      try {
          if(isSystemAdmin) {
              try {
                  const mgrRes = await api.get('/admin/staff');
                  setManagersList(extractArray(mgrRes.data)); 
              } catch (err) {}
          }

          let fetchedBiz = [];
          try {
              const bizRes = await api.get('/admin/businesses'); 
              fetchedBiz = extractArray(bizRes.data);
              setBusinesses(fetchedBiz);
          } catch (err) {}

          if (fetchedBiz.length > 0) {
              if (!isSystemAdmin && fetchedBiz.length === 1) {
                  const singleBiz = fetchedBiz[0];
                  setActiveBusiness(singleBiz);
                  setViewLevel('batches');
                  await refreshBatches(singleBiz.id);
              } else {
                  setViewLevel('businesses');
              }
          } else {
              try {
                  const batchRes = await api.get(`/admin/manager/batches-full?t=${Date.now()}`);
                  const fetchedBatches = extractArray(batchRes.data);
                  setBatches(fetchedBatches);
                  if (fetchedBatches.length > 0 && fetchedBatches[0].business) {
                      setActiveBusiness(fetchedBatches[0].business);
                  }
                  setViewLevel('batches');
              } catch (err) {}
          }

          try {
              const tutesRes = await api.get('/admin/delivery/master-tutes');
              setMasterTutes(tutesRes.data || []);
          } catch (e) {}

      } catch (e) {
          console.error("fetchInitialData error", e);
      } finally { setLoading(false); }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const refreshBatches = async (bizId) => {
      try {
          const targetBizId = bizId || activeBusiness?.id;
          let fetchedBatches = [];
          if (targetBizId) {
              const res = await api.get(`/admin/batches/${targetBizId}?t=${Date.now()}`);
              const data = res.data.batches || res.data;
              fetchedBatches = Array.isArray(data) ? data : [];
          } else {
              const res = await api.get(`/admin/manager/batches-full?t=${Date.now()}`);
              const data = res.data.batches || res.data;
              fetchedBatches = Array.isArray(data) ? data : [];
          }
          setBatches(fetchedBatches);
          
          if (activeBatch) {
              const updatedBatch = fetchedBatches.find(b => b.id.toString() === activeBatch.id.toString());
              if (updatedBatch) { 
                  setActiveBatch(updatedBatch); 
                  if (updatedBatch.business) setActiveBusiness(updatedBatch.business);
                  extractUniqueSubjects(updatedBatch); 
              }
          }
      } catch(e) { console.error("refreshBatches error", e); }
  };

  const extractUniqueSubjects = (batch) => {
      const subs = [];
      batch?.groups?.forEach(g => {
          g.courses?.forEach(c => {
              const existing = subs.find(s => s.name === c.name);
              
              let gpData = {};
              try {
                  const parsed = typeof c.groupPrices === 'string' ? JSON.parse(c.groupPrices) : (c.groupPrices || []);
                  gpData = parsed.find(p => parseInt(p.groupId) === parseInt(g.id)) || {};
              } catch(e) {}

              const priceObj = { 
                  groupId: g.id, 
                  groupName: g.name, 
                  groupType: g.type, 
                  courseId: c.id, // 🔥 FIX: Store the actual course ID for this group
                  price: c.price, 
                  deliverTute: gpData.deliverTute === true || gpData.deliverTute === 'true', 
                  tuteName: gpData.tuteName || '',
                  tuteCover: gpData.tuteCover || null,
                  tutes: gpData.tutes || [],
                  lecturerImage: gpData.lecturerImage || null
              };

              if(!existing) { 
                  subs.push({...c, groupPrices: [priceObj], allCourseIds: [c.id] }); 
              } else { 
                  existing.groupPrices.push(priceObj); 
                  existing.allCourseIds.push(c.id);
                  if (c.price > existing.price) {
                      existing.id = c.id;
                      existing.price = c.price;
                      existing.code = c.code;
                      existing.description = c.description;
                      existing.groupId = c.groupId;
                  }
              }
          });
      });
      setUniqueSubjects(subs.sort((a,b) => a.itemOrder - b.itemOrder));
  };

  const fetchContents = async (subject, batch) => {
      try {
          const safeCode = subject.code || `SUB_${subject.id}`;
          const courseIdsParam = subject.allCourseIds ? subject.allCourseIds.join(',') : subject.id;
          const res = await api.get(`/admin/manager/get-contents?batchId=${batch.id}&courseCode=${safeCode}&courseIds=${courseIdsParam}`);
          setLessonGroups(res.data?.lessonGroups || []);
          setSubjectContents(res.data?.contents || []);
          const newOpenState = {};
          (res.data?.lessonGroups || []).forEach(f => newOpenState[f.id] = true);
          setOpenFolders(newOpenState);
      } catch (e) { toast.error("Failed to load contents"); }
  };

  const fetchPosts = async () => {
      try {
          const res = await api.get('/admin/manager/posts');
          setPostsList(res.data || []);
      } catch (e) { toast.error("Failed to load posts"); }
  };

  const handleBack = (level) => {
      setViewLevel(level);
      if(level === 'businesses') { setActiveBusiness(null); setActiveBatch(null); setActiveSubject(null); }
      if(level === 'batches') { setActiveBatch(null); setActiveSubject(null); }
      if(level === 'batch_details') { setActiveSubject(null); }
  };

  const openBusinessDetails = (biz) => { setActiveBusiness(biz); setViewLevel('batches'); refreshBatches(biz.id); };
  const openBatchDetails = (batch) => { 
      setActiveBatch(batch); 
      if (batch?.business) {
          setActiveBusiness(batch.business);
      }
      extractUniqueSubjects(batch); 
      setViewLevel('batch_details'); 
      setBatchTab('subjects'); 
  };
  const openContentsView = async (subject) => { setActiveSubject(subject); setViewLevel('contents'); setLoading(true); await fetchContents(subject, activeBatch); setLoading(false); };

  const getBaseUrl = () => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          let url = api.defaults.baseURL || 'http://localhost:5000/api';
          return url.replace('/api', '');
      }
      return 'https://imacampus.online';
  };

  const getImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${getBaseUrl()}/storage/icons/${imageName}`;
  const getPostImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? null : `${getBaseUrl()}/storage/posts/${imageName}`;
  
  const getManagerName = (id) => { const m = managersList.find(m => m.id.toString() === id?.toString()); return m ? `${m.firstName} ${m.lastName}` : 'Not Assigned'; };
  const getBatchStreams = () => { try { return activeBusiness?.streams ? activeBusiness.streams.split(',').map(s=>s.trim()) : []; } catch(e) { return []; } };

  const groupedSubjects = uniqueSubjects.reduce((acc, sub) => {
      if (activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') {
          let subStreams = [];
          try {
              if (Array.isArray(sub.streams)) subStreams = sub.streams;
              else if (typeof sub.streams === 'string') {
                  const parsed = JSON.parse(sub.streams);
                  subStreams = Array.isArray(parsed) ? parsed : sub.streams.split(',').map(s=>s.trim());
              } else if (sub.stream) subStreams = [sub.stream];
          } catch(e) {
              if (typeof sub.streams === 'string') subStreams = sub.streams.split(',').map(s=>s.trim());
          }
          if (!Array.isArray(subStreams) || subStreams.length === 0) subStreams = ['Common Subjects'];

          subStreams.forEach(st => {
              if(!acc[st]) acc[st] = [];
              if(!acc[st].find(s => s.id === sub.id)) acc[st].push(sub);
          });
      } else {
          if(!acc['All Subjects']) acc['All Subjects'] = [];
          acc['All Subjects'].push(sub);
      }
      return acc;
  }, {});

  const getTypeInt = (tabStr) => { switch(tabStr) { case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5; default: return 1; } };
  
  const getEmbedUrl = (url) => {
      if (!url) return '';
      try {
          if (url.includes('drive.google.com') && url.includes('/view')) {
              return url.replace('/view', '/preview');
          }
          const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
          const match = url.match(ytRegex);
          if (match && match[1] && match[1].length === 11) {
              return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1`;
          }
          return url; 
      } catch(e) {
          return url;
      }
  };
  const isMatchedType = (item) => {
      const typeStr = contentType || contentTab;
      const typeInt = getTypeInt(typeStr);
      
      // If item is a folder (ContentGroup), it has a numeric 'type'
      if (item.type !== undefined) {
          return parseInt(item.type) === typeInt;
      }
      
      // If item is a Content, it has a string 'contentType' (e.g. 'live', 'recording')
      if (item.contentType !== undefined) {
          // If it's already a number or numeric string, check against typeInt
          if (!isNaN(item.contentType)) return parseInt(item.contentType) === typeInt;
          // Otherwise, it's a string like 'live', check against typeStr
          return item.contentType === typeStr;
      }
      
      // Fallback
      return typeInt === 1;
  };
  const getFolderId = (item) => { const fId = item.content_group_id ?? item.contentGroupId ?? item.folder_id; return fId ? String(fId) : null; };

  const toggleBusinessStatus = async (biz) => {
      if(!window.confirm(`Are you sure you want to ${biz.status === 1 ? 'Hide' : 'Show'} this Business in the Student Dashboard?`)) return;
      try { await api.put('/course-setup/business/toggle-status', { business_id: biz.id, status: biz.status === 1 ? 0 : 1 }); toast.success("Business Visibility Updated!"); fetchInitialData(); } catch (e) { toast.error("Failed"); }
  };

  const toggleBatchStatus = async (batch) => {
      if(!window.confirm(`Are you sure you want to ${batch.status === 1 ? 'Hide' : 'Show'} this Batch in the Student Dashboard?`)) return;
      try { await api.put('/course-setup/batch/toggle-status', { batch_id: batch.id, status: batch.status === 1 ? 0 : 1 }); toast.success("Batch Visibility Updated!"); refreshBatches(activeBusiness.id); } catch (e) { toast.error("Failed"); }
  };

  const deleteItem = async (url, payload, successMsg) => {
      if(window.confirm("Are you sure you want to delete this item?")) {
          try { 
              await api.delete(url, { data: payload }); 
              toast.success(successMsg); 
              if(viewLevel==='businesses') fetchInitialData(); else refreshBatches(activeBusiness.id); 
              if(viewLevel==='contents') fetchContents(activeSubject, activeBatch);
          } catch(e) { 
              toast.error("Error: Cannot delete. Please Deactivate it instead."); 
          }
      }
  };

  const openInstallmentModal = async () => {
      if(!activeBatch) return toast.error("Please select a batch first!");
      setInstallmentSubjectCount('');
      setInstallmentSteps([{step: 1, amount: '', gapDays: '0'}]);
      setEditInstallmentId(null);
      setShowInstallmentModal(true); 
      try {
          const res = await api.get(`/course-setup/installment/${activeBatch.id}`);
          setExistingInstallments(res.data || []);
      } catch (e) { console.error(e); }
  };

  const handleEditInstallment = (plan) => {
      setEditInstallmentId(plan.id);
      setInstallmentSubjectCount(plan.subjectCount);
      setInstallmentSteps(typeof plan.details === 'string' ? JSON.parse(plan.details) : plan.details);
  };

  const handleDeleteInstallment = async (id) => {
      if(!window.confirm("Delete this installment plan?")) return;
      try {
          await api.delete('/course-setup/installment', { data: { plan_id: id } });
          toast.success("Installment Plan Deleted!");
          setExistingInstallments(existingInstallments.filter(i => i.id.toString() !== id.toString()));
          if(editInstallmentId === id) {
              setEditInstallmentId(null);
              setInstallmentSubjectCount('');
              setInstallmentSteps([{step: 1, amount: '', gapDays: '0'}]);
          }
      } catch (e) { toast.error("Delete failed"); }
  };

  const handleInstallmentSubmit = async (e) => {
      e.preventDefault();
      try {
          if (editInstallmentId) {
              await api.put('/course-setup/installment', { plan_id: editInstallmentId, subjectCount: installmentSubjectCount, installmentsData: installmentSteps });
              toast.success("Installment Plan Updated!");
          } else {
              await api.post('/course-setup/installment', { batch_id: activeBatch.id, subjectCount: installmentSubjectCount, installmentsData: installmentSteps });
              toast.success("Installment Setup Complete!");
          }
          const res = await api.get(`/course-setup/installment/${activeBatch.id}`);
          setExistingInstallments(res.data || []);
          setEditInstallmentId(null);
          setInstallmentSubjectCount('');
          setInstallmentSteps([{step: 1, amount: '', gapDays: '0'}]);
      } catch(e) { toast.error("Failed to setup installments"); }
  };

  const handlePostSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      const formData = new FormData(e.target);
      try {
          await api.post('/admin/manager/post/create', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Post Published Successfully!");
          setShowPostModal(false);
          fetchPosts(); 
      } catch (err) {
          toast.error("Failed to publish post.");
      } finally { setLoading(false); }
  };

  const openPostModal = () => {
      setPostBizId(isSystemAdmin ? 'all' : (activeBusiness?.id || 'all'));
      setShowPostModal(true);
  };

  const handleBusinessSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      if(formData.get('category') === 'Advance Level' || formData.get('category') === 'AL') {
          const streams = [];
          ['Art', 'Commerce', 'Tech', 'Bio', 'Maths'].forEach(s => { if(formData.get(`stream_${s}`)) streams.push(s); });
          formData.set('streams', streams.join(','));
      }
      formData.set('isDiscountEnabledForInstallments', formData.get('isDiscountEnabledForInstallments') ? 1 : 0);

      try {
          if(editMode) { formData.set('businessId', editData.id); await api.put('/admin/business/update', formData); } 
          else { await api.post('/course-setup/business', formData); }
          toast.success(editMode ? "Business Updated!" : "Business Created!");
          setShowBusinessModal(false); fetchInitialData(); setSelectedLogoName(""); 
      } catch(e) { toast.error("Error saving business"); }
  };

  const handleAssignManagers = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
          await api.put(`/admin/businesses/${editData.id}/assign`, { head_manager_id: formData.get('head_manager'), ass_manager_id: formData.get('ass_manager') });
          toast.success("Managers Assigned!");
          setShowAssignModal(false); fetchInitialData();
      } catch(e) { toast.error("Assignment Failed"); }
  };

  const handleBatchSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      formData.set('business_id', activeBusiness.id);
      try {
          if(editMode) { formData.set('batch_id', editData.id); await api.put('/admin/batch/update', formData); } 
          else { await api.post('/course-setup/batch', formData); }
          toast.success(editMode ? "Batch Updated!" : "Batch Created!");
          setShowBatchModal(false); refreshBatches(activeBusiness.id); setSelectedLogoName("");
      } catch(e) { toast.error("Error saving batch. Backend endpoint might be missing."); }
  };

  const handleGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const pType = formData.get('paymentType');
      const cleanDiscountRules = discountRules.filter(rule => rule.courseCount != null && rule.courseCount !== '' && ((rule.pricePerCourse != null && rule.pricePerCourse !== '') || (rule.fixedDiscount != null && rule.fixedDiscount !== ''))).map(rule => ({ 
          courseCount: parseInt(rule.courseCount, 10), 
          ...(rule.pricePerCourse != null && rule.pricePerCourse !== '' && { pricePerCourse: parseFloat(rule.pricePerCourse) }),
          ...(rule.fixedDiscount != null && rule.fixedDiscount !== '' && { fixedDiscount: parseFloat(rule.fixedDiscount) })
      }));

      const payload = { 
          group_id: editData?.id, batch_id: activeBatch.id, name: formData.get('name'), paymentType: pType, itemOrder: formData.get('itemOrder'), 
          discountRules: pType === 'Full Payment' ? cleanDiscountRules : [] 
      };
      
      try {
          if(editMode) await api.put('/course-setup/group/update', payload); 
          else await api.post('/course-setup/group', payload);
          toast.success(editMode ? "Group Updated!" : "Group Created!");
          setShowGroupModal(false); refreshBatches(activeBusiness.id);
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleLecturerSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const name = formData.get('name');
      const phone = formData.get('phone');
      let currentLecturers = [];
      try { currentLecturers = JSON.parse(activeBatch?.lecturers || '[]'); } catch(e){}
      
      if(editMode) { currentLecturers[editData.index] = { name, phone }; } 
      else { currentLecturers.push({ name, phone }); }
      
      try {
          await api.put('/admin/batch/lecturers', { batch_id: activeBatch.id, lecturers: currentLecturers });
          toast.success(editMode ? "Lecturer Updated!" : "Lecturer Added!");
          setShowLecturerModal(false);
          refreshBatches(activeBusiness.id);
      } catch(e) { toast.error("Failed to save Lecturer"); }
  };

  const handleDeleteLecturer = async (index) => {
      if(!window.confirm("Are you sure you want to delete this Lecturer?")) return;
      let currentLecturers = [];
      try { currentLecturers = JSON.parse(activeBatch?.lecturers || '[]'); } catch(e){}
      currentLecturers.splice(index, 1);
      try {
          await api.put('/admin/batch/lecturers', { batch_id: activeBatch.id, lecturers: currentLecturers });
          toast.success("Lecturer Deleted!");
          refreshBatches(activeBusiness.id);
      } catch(e) { toast.error("Failed to delete Lecturer"); }
  };

  const handleCourseSubmit = async (e) => {
      e.preventDefault();
      const keys = Object.keys(selectedGroupPrices);
      if (keys.length === 0) return toast.error("Please tick at least one group and enter a price!");
      
      const formData = new FormData(e.target);
      formData.set("startMonth", formData.get("startMonth") || "");
      formData.set("endMonth", formData.get("endMonth") || "");
      const selectedStreams = formData.getAll('streams');
      const excludeDiscount = formData.get('isDiscountExcluded') === 'true';

      const formattedPrices = keys.map(k => ({ 
          groupId: k, 
          price: selectedGroupPrices[k].price,
          deliverTute: selectedGroupPrices[k].deliverTute,
          tuteName: selectedGroupPrices[k].tuteName,
          tuteCover: selectedGroupPrices[k].tuteCover,
          tutes: selectedGroupPrices[k].tutes || [],
          lecturerImage: selectedGroupPrices[k].lecturerImage
      }));

      formData.set('course_id', editData?.id || '');
      formData.set('stream', selectedStreams.length > 0 ? selectedStreams[0] : '');
      formData.set('streams', JSON.stringify(selectedStreams));
      formData.set('itemOrder', formData.get('itemOrder') || 1);
      formData.set('courseType', 1);
      formData.set('groupPricing', JSON.stringify(formattedPrices));
      formData.set('groupPrices', JSON.stringify(formattedPrices));
      formData.set('isDiscountExcluded', excludeDiscount);
      formData.set('batch_id', activeBatch.id);
      
      try {
          if(editMode) { 
              formData.set('price', formattedPrices[0].price); 
              await api.put('/admin/course/update', formData, { headers: { 'Content-Type': 'multipart/form-data' }}); 
          } else { 
              await api.post('/course-setup/subject', formData, { headers: { 'Content-Type': 'multipart/form-data' }}); 
          }
          toast.success(editMode ? "Subject Updated!" : "Subject Created!");
          setShowCourseModal(false); refreshBatches(activeBusiness.id);
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleLessonGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const folderType = getTypeInt(contentTab); 
      const payload = { 
          contentGroupId: editData?.id, title: formData.get('title'), type: folderType, order: formData.get('order') || 1, 
          batch_id: activeBatch.id, course_code: activeSubject.code || `SUB_${activeSubject.id}`,
          selectedBatches: selectedBatchesForContent
      };

      try {
          if(editMode) await api.put('/admin/content-group/update', payload); 
          else await api.post('/admin/manager/content-group/add', payload);
          toast.success(editMode ? "Folder Updated!" : "Folder Created!");
          setShowLessonGroupModal(false); fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleMassAssignSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      formData.set('type', contentType);
      formData.set('batch_id', activeBatch.id);

      try {
          if (editMode) {
              if (massAssignSubjects.length === 0) return toast.error("Please select at least one subject to assign this content!");
              formData.set('selectedCourses', JSON.stringify(massAssignSubjects));
              formData.set('selectedBatches', JSON.stringify(selectedBatchesForContent));
              if (editData?.id) formData.set('content_id', editData.id);
              const topF = formData.get('contentGroupId') || (editData?.contentGroupId ? String(editData.contentGroupId) : '');
              if (topF && topF !== 'null' && topF !== 'undefined' && topF !== '') {
                  formData.set('contentGroupId', topF);
              } else {
                  formData.set('contentGroupId', '');
              }
              await api.put('/admin/manager/contents/update', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          } else {
              // Group selections by folderId for multi-batch, multi-folder creation
              const folderGroups = {}; 
              let hasSelections = false;
              const defaultTopFolder = formData.get('contentGroupId') || prefilledFolder || '';

              Object.keys(hubBatchConfigs).forEach(bId => {
                  Object.keys(hubBatchConfigs[bId]).forEach(cId => {
                      const config = hubBatchConfigs[bId][cId];
                      if (config.isChecked) {
                          hasSelections = true;
                          const folderKey = config.folderId || defaultTopFolder || 'uncategorized';
                          if (!folderGroups[folderKey]) folderGroups[folderKey] = { batches: new Set(), courses: new Set() };
                          folderGroups[folderKey].batches.add(bId);
                          folderGroups[folderKey].courses.add(cId);
                      }
                  });
              });

              if (!hasSelections) return toast.error("Please select at least one subject to assign this content!");

              const submissions = Object.keys(folderGroups).map(async (folderKey) => {
                  const fd = new FormData(e.target);
                  fd.set('type', contentType);
                  fd.set('batch_id', activeBatch.id);
                  
                  if (folderKey && folderKey !== 'uncategorized' && folderKey !== 'null' && folderKey !== 'undefined') {
                      fd.set('contentGroupId', folderKey);
                  } else {
                      fd.delete('contentGroupId');
                  }
                  
                  fd.set('selectedBatches', JSON.stringify(Array.from(folderGroups[folderKey].batches)));
                  fd.set('selectedCourses', JSON.stringify(Array.from(folderGroups[folderKey].courses)));

                  return api.post('/admin/manager/contents/mass-assign', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
              });

              await Promise.all(submissions);
          }

          toast.success("Content Saved!");
          setShowContentModal(false); 
          setHubBatchConfigs({});
          setHubActiveBatchTab(null);
          if (activeSubject) fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Failed to process content"); }
  };

  const stateData = {
    isSystemAdmin, isManager, isStaff, canManageBusiness, canManageBatches, canManageGroupsAndSubjects, canManageContent,
    viewLevel, activeBusiness, activeBatch, batchTab, activeSubject, contentTab, businesses, managersList, batches, uniqueSubjects,
    lessonGroups, subjectContents, postsList, showBusinessModal, showAssignModal, showBatchModal, showGroupModal, showCourseModal,
    showLessonGroupModal, showContentModal, showPostModal, showManagePostsModal, previewData, editMode, editData, selectedLogoName,
    selectedGroupPrices, discountRules, contentType, prefilledFolder, selectedBatchesForContent, massAssignSubjects, openFolders,
    postBizId, postBatches, showInstallmentModal, existingInstallments, editInstallmentId, installmentSubjectCount, installmentSteps, groupedSubjects, loading, showLecturerModal, masterTutes,
    hubBatchConfigs, hubActiveBatchTab
  };

  const actionsData = {
    handleBack, openBusinessDetails, openBatchDetails, openContentsView, getImageUrl, getPostImageUrl, getManagerName,
    getBatchStreams, toggleBusinessStatus, toggleBatchStatus, deleteItem, openInstallmentModal, handleEditInstallment,
    handleDeleteInstallment, handleInstallmentSubmit, handlePostSubmit, openPostModal, handleBusinessSubmit, handleAssignManagers,
    handleBatchSubmit, handleGroupSubmit, handleCourseSubmit, handleLessonGroupSubmit, handleMassAssignSubmit, setEditMode,
    setSelectedLogoName, setShowBusinessModal, setShowAssignModal, setShowBatchModal, setShowGroupModal, setShowCourseModal,
    setShowLessonGroupModal, setShowContentModal, setShowPostModal, setShowManagePostsModal, setPreviewData, setContentType,
    setPrefilledFolder, setSelectedBatchesForContent, setMassAssignSubjects, toggleFolder, addDiscountRule, removeDiscountRule,
    handleDiscountRuleChange, addInstallmentStep, removeInstallmentStep, toggleGroupPrice, updateGroupData, toggleMassAssignSubject,
    fetchPosts, setPostBizId, setBatchTab, setContentTab, getTypeInt, getEmbedUrl, isMatchedType, getFolderId, setShowInstallmentModal, 
    setInstallmentSubjectCount, setInstallmentSteps, setEditInstallmentId, setEditData, setDiscountRules, setSelectedGroupPrices,
    setShowLecturerModal, handleLecturerSubmit, handleDeleteLecturer, setHubBatchConfigs, setHubActiveBatchTab
  };

  if (loading) return <div className="flex h-full items-center justify-center min-h-[60vh]"><Loader2 size={50} className="animate-spin text-brand-accent" /></div>;

  return (
    <div className="w-full animate-fade-in pb-4 flex flex-col font-sans relative z-10">
      
      {/* 🔥 Meka thama oyata ona karana Glassmorphism Header eka 🔥 */}
      <div className="mb-8 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col gap-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] shrink-0 transition-all">
          
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-400">
              {viewLevel !== 'businesses' && <button onClick={() => handleBack(viewLevel==='contents' ? 'batch_details' : viewLevel==='batch_details' ? 'batches' : 'businesses')} className="hover:text-white flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl transition-colors border border-white/5 outline-none"><ArrowLeft size={16}/> Back</button>}
              <button onClick={() => handleBack('businesses')} className={`hover:text-white transition-colors ${viewLevel==='businesses' ? 'text-white font-extrabold' : ''}`}>Businesses</button>
              {(viewLevel === 'batches' || viewLevel === 'batch_details' || viewLevel === 'contents') && activeBusiness && (
                  <><ChevronRight size={16} className="text-gray-500"/> <button onClick={() => handleBack('batches')} className={`hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none ${viewLevel==='batches' ? 'text-white font-extrabold' : ''}`}>{activeBusiness.name}</button></>
              )}
              {activeBatch && (viewLevel === 'batch_details' || viewLevel === 'contents') && (
                  <><ChevronRight size={16} className="text-gray-500"/> <button onClick={() => handleBack('batch_details')} className={`hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none ${viewLevel==='batch_details' ? 'text-white font-extrabold' : ''}`}>{activeBatch.name}</button></>
              )}
              {activeSubject && viewLevel === 'contents' && (
                  <><ChevronRight size={16} className="text-gray-500"/> <span className="text-white font-extrabold px-3 py-1 bg-brand-accent/40 border border-brand-accent/50 rounded-lg truncate max-w-[150px] sm:max-w-none shadow-sm">{activeSubject.name}</span></>
              )}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-6">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-4 tracking-tight truncate flex-1 drop-shadow-md">
                  {viewLevel === 'businesses' && <><Building2 className="text-brand-accent shrink-0 drop-shadow-sm" size={32}/> Manage Businesses</>}
                  {viewLevel === 'batches' && <><Layers className="text-brand-accent shrink-0 drop-shadow-sm" size={32}/> <span className="truncate" title={activeBusiness?.name}>{activeBusiness?.name} - Batches</span></>}
                  {viewLevel === 'batch_details' && <><FolderOpen className="text-brand-accent shrink-0 drop-shadow-sm" size={32}/> <span className="truncate" title={activeBatch?.name}>{activeBatch?.name}</span></>}
                  {viewLevel === 'contents' && <><MonitorPlay className="text-brand-accent shrink-0 drop-shadow-sm" size={32}/> <span className="truncate" title={activeSubject?.name}>{activeSubject?.name}</span></>}
              </h2>
              <div className="flex flex-wrap gap-3 shrink-0">
                  {viewLevel === 'businesses' && canManageBusiness && (
                      <button onClick={() => { setEditMode(false); setSelectedLogoName(""); setShowBusinessModal(true); }} className="bg-brand-accent/90 hover:bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent"><Plus size={18}/> New Business</button>
                  )}
                  {viewLevel === 'batches' && canManageBatches && (
                      <button onClick={() => { setEditMode(false); setSelectedLogoName(""); setShowBatchModal(true); }} className="bg-brand-accent/90 hover:bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent"><Plus size={18}/> New Batch</button>
                  )}
                  {viewLevel === 'batch_details' && canManageGroupsAndSubjects && (
                      <>
                          <button onClick={openInstallmentModal} className="bg-orange-500/90 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-transparent outline-none"><CreditCard size={18}/> Setup Installments</button>
                          {batchTab === 'groups' && <button onClick={() => { setEditMode(false); setShowGroupModal(true); setDiscountRules([{courseCount:'',pricePerCourse:''}]); }} className="bg-brand-accent/90 hover:bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent"><Plus size={18}/> New Group</button>}
                          {batchTab === 'subjects' && <button onClick={() => { setEditMode(false); setShowCourseModal(true); setSelectedGroupPrices({}); }} className="bg-brand-accent/90 hover:bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent"><Plus size={18}/> New Subject</button>}
                          {batchTab === 'lecturers' && <button onClick={() => { setEditMode(false); setShowLecturerModal(true); }} className="bg-brand-accent/90 hover:bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent"><Plus size={18}/> New Lecturer</button>}
                      </>
                  )}
                  {viewLevel === 'contents' && canManageContent && (
                      <>
                          <button onClick={() => { setShowLessonGroupModal(true); setEditMode(false); }} className="bg-white/5 hover:bg-white/10 text-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors border border-white/10 shadow-sm outline-none"><FolderPlus size={18}/> Add Folder</button>
                          <button onClick={() => { 
                              setShowContentModal(true); setContentType(''); setPrefilledFolder(''); setEditMode(false); 
                              setSelectedBatchesForContent([activeBatch.id]); 
                          }} className="bg-emerald-600/90 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(5,150,105,0.4)] border border-transparent outline-none"><Plus size={18}/> Add Content</button>
                      </>
                  )}
              </div>
          </div>
      </div>

      <ContentHubViews state={stateData} actions={actionsData} />
      <ContentHubModals state={stateData} actions={actionsData} />
    </div>
  );
}