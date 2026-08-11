import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Video, Wand2, Download } from 'lucide-react';
import api from '../../../api/axios';

import { unicodeToLegacy } from '../../../utils/sinhalaFontConverter';

export default function VideoEditor() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedCaption, setSelectedCaption] = useState(null);
  
  // Global Styles
  const [globalStyles, setGlobalStyles] = useState({
    fontFamily: 'sans-serif',
    isLegacyFont: false,
    fontSize: 32,
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: '#000000',
    shadowOffsetX: 2,
    shadowOffsetY: 2
  });

  const videoRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setCaptions([]);
    }
  };

  const handleProcessVideo = async () => {
    if (!videoFile) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const response = await api.post('/social-media/video-editor/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000 // 5 minutes timeout for AI audio extraction & Gemini transcription
      });
      
      const data = response.data;
      
      setCaptions(data.captions || []);
      alert(`Success! Generated ${data.captions?.length || 0} caption blocks.`);
    } catch (error) {
      console.error('[VideoEditor Error]:', error);
      const errMsg = error.response?.data?.error || error.message || 'Network error during upload';
      alert('Error: ' + errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportVideo = async () => {
    if (!videoFile || captions.length === 0) return;
    setIsProcessing(true);

    try {
      // Pre-convert text for backend if legacy font is used
      const exportCaptions = captions.map(c => ({
        ...c,
        text: globalStyles.isLegacyFont ? unicodeToLegacy(c.text) : c.text
      }));

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('captions', JSON.stringify(exportCaptions));
      formData.append('styles', JSON.stringify(globalStyles));

      const response = await api.post('/social-media/video-editor/export', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;

      if (data.downloadUrl) {
         // Create a temporary link to download the video
         const a = document.createElement('a');
         // We might need to construct full URL if downloadUrl is relative
         a.href = data.downloadUrl.startsWith('http') ? data.downloadUrl : api.defaults.baseURL.replace('/api', '') + data.downloadUrl;
         a.download = 'IMA_Promo_Export.mp4';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         alert('Export successful! Downloading video...');
      } else {
         alert('Export started! Check backend logs.');
      }
    } catch (error) {
      console.error(error);
      alert('Export Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportSRT = () => {
    if (captions.length === 0) return;

    const formatSRTTime = (seconds) => {
      const pad = (num, size) => ('000' + num).slice(size * -1);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
    };

    let srtContent = '';
    captions.forEach((c, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatSRTTime(c.start)} --> ${formatSRTTime(c.end)}\n`;
      // Always export as Unicode to prevent "kotu kotu" rendering in editors that support Unicode
      const text = c.text;
      srtContent += `${text}\n\n`;
    });

    // Prepend UTF-8 BOM (\uFEFF) to ensure editors read the file as UTF-8
    const blob = new Blob(['\uFEFF' + srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capcut_captions.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const updateCaption = (id, field, value) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const updateGlobalStyle = (field, value) => {
      setGlobalStyles(prev => ({ ...prev, [field]: value }));
  };

  // Find caption for current time
  const activeCaption = captions.find(c => currentTime >= c.start && currentTime <= c.end);
  
  // Format caption text based on selected font
  const displayCaptionText = activeCaption ? (globalStyles.isLegacyFont ? unicodeToLegacy(activeCaption.text) : activeCaption.text) : "";

  return (
    <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-md flex flex-col h-[85vh]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="text-brand-accent" /> AI Video Editor
          </h2>
          <p className="text-sm text-slate-400">Upload promo videos and auto-generate Sinhala captions.</p>
        </div>
        <div className="flex gap-3">
            {videoFile && captions.length > 0 && (
                <>
                  <button 
                    onClick={handleExportSRT}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-500 transition-colors"
                  >
                    <Download size={16} /> Export SRT
                  </button>
                  <button 
                    onClick={handleExportVideo}
                    disabled={isProcessing}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    <Wand2 size={16} /> {isProcessing ? 'Exporting...' : 'Export Video'}
                  </button>
                </>
            )}
            {videoFile && (
              <button 
                onClick={handleProcessVideo}
                disabled={isProcessing}
                className="bg-brand-accent text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-opacity-90 disabled:opacity-50"
              >
                <Wand2 size={16} /> {isProcessing ? 'Processing AI...' : 'Auto Generate Captions'}
              </button>
            )}
        </div>
      </div>

      {!videoUrl ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-black/20 relative">
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <UploadCloud size={48} className="text-slate-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Drag & Drop or Click to Upload</h3>
          <p className="text-sm text-slate-400">Supported formats: MP4, MOV (Max 500MB)</p>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden">
          
          {/* Main Video & Timeline Area */}
          <div className="flex flex-col flex-1 gap-4 overflow-hidden">
            <div className="flex-1 bg-black rounded-xl overflow-hidden relative flex justify-center items-center">
              <video 
                ref={videoRef}
                src={videoUrl} 
                controls 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="max-w-full max-h-full"
              />
              
              {/* Real-time Caption Preview Canvas */}
              {activeCaption && (
                 <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none px-10">
                    <span className="font-bold drop-shadow-xl p-2 bg-black/20 rounded-lg whitespace-pre-wrap" style={{ 
                        fontFamily: globalStyles.fontFamily,
                        fontSize: `${globalStyles.fontSize}px`,
                        color: globalStyles.color,
                        WebkitTextStroke: `${globalStyles.strokeWidth}px ${globalStyles.strokeColor}`,
                        textShadow: `${globalStyles.shadowOffsetX}px ${globalStyles.shadowOffsetY}px 0 ${globalStyles.shadowColor}`
                    }}>
                        {displayCaptionText}
                    </span>
                 </div>
              )}
            </div>
            
            {/* Timeline UI */}
            <div className="h-48 bg-[#0f172a] border border-white/10 rounded-xl p-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <p className="text-slate-400 font-bold text-sm">Timeline</p>
                <p className="text-xs text-brand-accent font-mono">{currentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s</p>
              </div>
              
              <div className="flex-1 bg-black/50 rounded-lg relative overflow-x-auto overflow-y-hidden border border-white/5">
                 {videoDuration > 0 && captions.map(c => {
                     const left = (c.start / videoDuration) * 100;
                     const width = ((c.end - c.start) / videoDuration) * 100;
                     const isSelected = selectedCaption?.id === c.id;
                     
                     return (
                         <div 
                           key={c.id}
                           onClick={() => setSelectedCaption(c)}
                           className={`absolute h-8 top-1/2 -translate-y-1/2 rounded cursor-pointer border truncate px-1 text-xs font-bold leading-8 transition-all ${
                               isSelected ? 'bg-brand-accent border-white text-white z-10' : 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-slate-600'
                           }`}
                           style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                         >
                            {c.text}
                         </div>
                     );
                 })}
                 
                 {/* Playhead */}
                 {videoDuration > 0 && (
                     <div 
                       className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                       style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                     >
                         <div className="absolute -top-2 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-sm rotate-45"></div>
                     </div>
                 )}
              </div>
            </div>
          </div>

          {/* Side Panel for Editing */}
          <div className="w-80 bg-[#0f172a] rounded-xl border border-white/10 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <h3 className="text-white font-bold mb-2">Style & Edit</h3>
              
              {selectedCaption && (
                  <div className="flex flex-col gap-3">
                      <div className="bg-brand-accent/20 text-brand-accent p-2 rounded-lg text-xs font-bold border border-brand-accent/30 flex justify-between">
                          <span>Block #{selectedCaption.id}</span>
                          <span>{selectedCaption.start.toFixed(1)}s - {selectedCaption.end.toFixed(1)}s</span>
                      </div>
                      
                      <label className="text-sm text-slate-400">Caption Text</label>
                      <textarea 
                          value={selectedCaption.text}
                          onChange={(e) => updateCaption(selectedCaption.id, 'text', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-brand-accent min-h-[80px]"
                      />
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                              <label className="text-xs text-slate-400">Start Time (s)</label>
                              <input 
                                  type="number"
                                  step="0.1"
                                  value={selectedCaption.start}
                                  onChange={(e) => updateCaption(selectedCaption.id, 'start', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-brand-accent"
                              />
                          </div>
                          <div>
                              <label className="text-xs text-slate-400">End Time (s)</label>
                              <input 
                                  type="number"
                                  step="0.1"
                                  value={selectedCaption.end}
                                  onChange={(e) => updateCaption(selectedCaption.id, 'end', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-brand-accent"
                              />
                          </div>
                      </div>
                      
                      <hr className="border-white/5 my-2" />
                  </div>
              )}
              
              {/* Global Styling */}
              <h4 className="text-sm font-bold text-white mt-2">Global Styling</h4>
              
              <div className="flex flex-col gap-3">
                  <div>
                      <label className="text-xs text-slate-400">Font Family</label>
                      <select 
                          value={globalStyles.fontFamily}
                          onChange={(e) => {
                              updateGlobalStyle('fontFamily', e.target.value);
                              updateGlobalStyle('isLegacyFont', e.target.value === 'FM-Abhaya');
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-brand-accent appearance-none mt-1"
                      >
                          <option value="sans-serif">System Default (Unicode)</option>
                          <option value="FM-Abhaya">FM-Abhaya (Legacy)</option>
                      </select>
                  </div>
                  
                  <div>
                      <label className="text-xs text-slate-400">Font Size ({globalStyles.fontSize}px)</label>
                      <input 
                          type="range"
                          min="16" max="72"
                          value={globalStyles.fontSize}
                          onChange={(e) => updateGlobalStyle('fontSize', parseInt(e.target.value))}
                          className="w-full mt-1"
                      />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                      <div>
                          <label className="text-xs text-slate-400">Text Color</label>
                          <input 
                              type="color"
                              value={globalStyles.color}
                              onChange={(e) => updateGlobalStyle('color', e.target.value)}
                              className="w-full h-8 mt-1 rounded bg-black/40 border border-white/10 cursor-pointer"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-slate-400">Stroke Color</label>
                          <input 
                              type="color"
                              value={globalStyles.strokeColor}
                              onChange={(e) => updateGlobalStyle('strokeColor', e.target.value)}
                              className="w-full h-8 mt-1 rounded bg-black/40 border border-white/10 cursor-pointer"
                          />
                      </div>
                  </div>
                  
                  <div>
                      <label className="text-xs text-slate-400">Stroke Width ({globalStyles.strokeWidth}px)</label>
                      <input 
                          type="range"
                          min="0" max="10"
                          value={globalStyles.strokeWidth}
                          onChange={(e) => updateGlobalStyle('strokeWidth', parseInt(e.target.value))}
                          className="w-full mt-1"
                      />
                  </div>
                  
                  <div>
                      <label className="text-xs text-slate-400">Shadow Color</label>
                      <input 
                          type="color"
                          value={globalStyles.shadowColor}
                          onChange={(e) => updateGlobalStyle('shadowColor', e.target.value)}
                          className="w-full h-8 mt-1 rounded bg-black/40 border border-white/10 cursor-pointer"
                      />
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
