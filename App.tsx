import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import ImageEditorModal from './components/ImageEditorModal';
import { Session, GeneratedImage, ModelConfig, ModelType } from './types';
import { generateDiversePrompts, generateImageWithGemini, generateImageCustom } from './services/api';

// Declare window interface for AI Studio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const DEFAULT_MODEL: ModelConfig = {
  id: 'default-gemini',
  name: 'Nanobanana Pro (Default)',
  type: ModelType.GEMINI,
  modelId: 'gemini-3-pro-image-preview'
};

const COUNT_OPTIONS = [1, 2, 4, 8, 10, 20, 50];

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Ref to track latest sessions state for async operations
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string>(DEFAULT_MODEL.id);
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([DEFAULT_MODEL]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Editor & Filtering State
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);

  // Refs for generation control
  const abortControllerRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input State
  const [promptInput, setPromptInput] = useState('');
  const [refImages, setRefImages] = useState<string[]>([]);
  const [genCount, setGenCount] = useState<number>(4);

  // Check API Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const hasSelected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasSelected);
        } catch (e) {
          console.error("Failed to check API key status", e);
          setHasApiKey(true);
        }
      } else {
        setHasApiKey(true);
      }
      setIsCheckingKey(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Failed to select key", e);
      }
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const activeModel = modelConfigs.find(m => m.id === activeModelId) || DEFAULT_MODEL;

  const handleNewSession = () => {
    setActiveSessionId(null);
    setPromptInput('');
    setRefImages([]);
    setGenCount(4);
    setActiveFilterTag(null);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      setPromptInput(session.basePrompt);
      setRefImages(session.referenceImages);
      setGenCount(session.totalTarget);
      setActiveFilterTag(null);
    }
  };

  const createSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      name: promptInput.substring(0, 30) || 'Untitled Task',
      basePrompt: promptInput,
      referenceImages: [...refImages],
      generatedImages: [],
      generatedPrompts: [],
      createdAt: Date.now(),
      status: 'idle',
      totalTarget: genCount,
      progress: 0,
      logs: ['Session initialized. Waiting to start...']
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveFilterTag(null);

    setTimeout(() => {
        startGeneration(newSession.id);
    }, 100);
  };

  const updateSession = (id: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addLog = (sessionId: string, message: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${message}`] };
      }
      return s;
    }));
  };

  const stopGeneration = (sessionId: string) => {
    abortControllerRef.current = true;
    updateSession(sessionId, { status: 'stopped' });
    addLog(sessionId, "User interrupted the generation process.");
  };

  const startGeneration = async (sessionId: string) => {
    const session = sessionsRef.current.find(s => s.id === sessionId);
    if (!session) return;

    abortControllerRef.current = false;
    updateSession(sessionId, { status: 'generating', progress: 5, logs: [] });
    addLog(sessionId, `Starting generation task for ${session.totalTarget} images.`);

    try {
      addLog(sessionId, "Synthesizing diverse prompts & analyzing constraints...");
      
      let diversePrompts: string[];
      let aspectRatio: string;

      try {
        const result = await generateDiversePrompts(
          session.basePrompt, 
          session.totalTarget, 
          session.referenceImages.length
        );
        diversePrompts = result.prompts;
        aspectRatio = result.aspectRatio;
      } catch (expansionError: any) {
        addLog(sessionId, `Warning: Prompt expansion failed: ${expansionError.message}. Using original prompt as fallback.`);
        diversePrompts = Array(session.totalTarget).fill(session.basePrompt);
        aspectRatio = "16:9"; // Default fallback
      }
      
      if (abortControllerRef.current) return;

      updateSession(sessionId, { generatedPrompts: diversePrompts, progress: 15 });
      addLog(sessionId, `Generated ${diversePrompts.length} unique variations.`);
      addLog(sessionId, `Target Aspect Ratio: ${aspectRatio}`);

      let completedCount = 0;
      for (let i = 0; i < diversePrompts.length; i++) {
        if (abortControllerRef.current) break;

        const prompt = diversePrompts[i];
        addLog(sessionId, `Generating image ${i + 1}/${diversePrompts.length}...`);
        
        try {
          const handleImageResult = (base64OrUrl: string) => {
            const newImage: GeneratedImage = {
              id: `${sessionId}_${Date.now()}_${i}`,
              url: base64OrUrl,
              prompt: prompt,
              timestamp: Date.now(),
              tags: []
            };
            
            setSessions(prev => {
                const current = prev.find(s => s.id === sessionId);
                if(!current) return prev;
                const updatedImages = [...current.generatedImages, newImage];
                const newProgress = 15 + Math.floor((updatedImages.length / current.totalTarget) * 85);
                return prev.map(s => s.id === sessionId ? {
                    ...s,
                    generatedImages: updatedImages,
                    progress: newProgress
                } : s);
            });
          };

          if (activeModel.type === ModelType.GEMINI) {
            await generateImageWithGemini(prompt, session.referenceImages, aspectRatio, handleImageResult);
          } else {
            await generateImageCustom(activeModel, prompt, aspectRatio, handleImageResult);
          }
        } catch (err: any) {
          console.error("Generation Loop Error:", err);
          addLog(sessionId, `Error generating image ${i + 1}: ${err.message}`);
        }
        completedCount++;
      }

      if (!abortControllerRef.current) {
        updateSession(sessionId, { status: 'completed', progress: 100 });
        addLog(sessionId, "Task completed successfully.");
      } else {
        updateSession(sessionId, { status: 'stopped' });
      }

    } catch (error: any) {
      updateSession(sessionId, { status: 'failed' });
      addLog(sessionId, `Critical Error: ${error.message}`);
    }
  };

  const handleFileSelection = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (refImages.length + validFiles.length > 4) {
      alert("Maximum 4 reference images allowed.");
      return;
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelection(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  const handleImageSave = (id: string, newUrl: string, newTags: string[]) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          generatedImages: s.generatedImages.map(img => 
            img.id === id ? { ...img, url: newUrl, tags: newTags } : img
          )
        };
      }
      return s;
    }));
  };

  const filteredImages = activeSession 
    ? activeSession.generatedImages.filter(img => !activeFilterTag || img.tags.includes(activeFilterTag))
    : [];

  const uniqueTags = activeSession 
    ? Array.from(new Set(activeSession.generatedImages.flatMap(img => img.tags))) 
    : [];

  const downloadVisible = () => {
    if (!activeSession) return;
    filteredImages.forEach((img, idx) => {
      const link = document.createElement('a');
      link.href = img.url;
      link.download = `synth_${activeSession.id}_${idx}_${activeFilterTag || 'all'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (isCheckingKey) {
    return <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
      <div className="w-8 h-8 border-2 border-slate-800 border-t-primary-500 rounded-full animate-spin"></div>
      <div className="text-xs font-mono tracking-widest uppercase">Initializing Core...</div>
    </div>;
  }

  if (!hasApiKey) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/30 rounded-full blur-[120px]"></div>
        </div>
        <div className="z-10 text-center space-y-8 p-12 bg-slate-900/60 backdrop-blur-3xl rounded-3xl border border-slate-800 max-w-lg shadow-2xl mx-4 ring-1 ring-white/5">
           <div className="flex justify-center">
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-900/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/></svg>
              </div>
           </div>
           <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">Access Required</h1>
              <p className="text-slate-400 leading-relaxed">SynthVision requires a valid API key to interact with the vision models. Please select a key to continue.</p>
           </div>
           <button 
             onClick={handleSelectKey} 
             className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-primary-900/40 hover:scale-[1.02] active:scale-[0.98] ring-1 ring-white/10"
           >
              Connect API Key
           </button>
           <p className="text-[10px] text-slate-500 uppercase tracking-widest">Supports Gemini & VEO Architectures</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={(e, id) => {
          e.stopPropagation();
          setSessions(prev => prev.filter(s => s.id !== id));
          if (activeSessionId === id) setActiveSessionId(null);
        }}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-bold text-white uppercase tracking-widest">
               {activeSession ? activeSession.name : 'Workbench'}
             </h2>
             {activeSession && (
               <div className="flex items-center gap-2">
                 <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                 <span className="text-[10px] text-slate-500 font-mono">ID: {activeSession.id}</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 text-[11px] font-bold text-slate-300 transition-all shadow-sm"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeModel.type === ModelType.GEMINI ? 'bg-green-500' : 'bg-blue-500'}`}></span>
              {activeModel.name.toUpperCase()}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth">
            {/* INPUT SECTION */}
            <div className="p-8 border-b border-slate-800/50 bg-slate-900/10">
               <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference Anchors</label>
                        <span className="text-[10px] font-mono text-slate-600">{refImages.length} / 4</span>
                    </div>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`grid grid-cols-4 gap-3 p-3 rounded-2xl transition-all duration-300 min-h-[100px] border-2 ${isDragging ? 'bg-primary-500/5 scale-[1.01] border-primary-500/50 border-dashed' : 'bg-slate-900/40 border-slate-800'}`}
                    >
                        {refImages.map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-xl border border-slate-700 overflow-hidden relative group bg-slate-800 animate-in zoom-in-75 duration-300 shadow-xl ring-1 ring-white/5">
                            <img src={img} alt="ref" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <button 
                                  onClick={() => setRefImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow-lg"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                            <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/10 shadow-lg">
                                REF_{idx + 1}
                            </div>
                        </div>
                        ))}
                        {refImages.length < 4 && (
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-800'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isDragging ? 'text-primary-500' : 'text-slate-600'} mb-1`}><path d="M12 5v14M5 12h14"/></svg>
                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${isDragging ? 'text-primary-500' : 'text-slate-600'}`}>Add Data</span>
                        </button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                    <p className="text-[10px] text-slate-600 leading-relaxed">Tip: Use drag and drop or click the + button to add visual anchors. Max 4 files.</p>
                  </div>

                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scenario Definition</label>
                      <textarea 
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          placeholder="Describe the desired scenario. Refer to your anchors using 'Ref 1', 'Ref 2', etc. Our engine will synthesize variations preserving these features."
                          className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:border-primary-500 outline-none resize-none transition-all focus:ring-4 focus:ring-primary-500/5 shadow-inner"
                      />
                    </div>
                    <div className="flex gap-4">
                       <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Generation Count</label>
                          <div className="flex gap-2">
                             {COUNT_OPTIONS.map(opt => (
                               <button 
                                 key={opt}
                                 onClick={() => setGenCount(opt)}
                                 className={`flex-1 py-2 text-[11px] font-bold rounded-xl border transition-all ${genCount === opt ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/40' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                               >
                                 {opt}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="flex items-end">
                          <button 
                              onClick={createSession}
                              disabled={!promptInput.trim()}
                              className="bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-3.5 px-8 rounded-xl shadow-2xl shadow-primary-900/40 transition-all active:scale-95 ring-1 ring-white/10 flex items-center gap-2 uppercase tracking-widest"
                          >
                              Synthesize
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </button>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* RESULTS SECTION */}
            {activeSession && (
                <div className="p-8 pb-32 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="h-px bg-slate-800 flex-1"></div>
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">Live Generation Stream</span>
                        <div className="h-px bg-slate-800 flex-1"></div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-2xl backdrop-blur-sm">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pipeline Status</div>
                                <div className={`text-3xl font-bold flex items-center gap-4 ${
                                    activeSession.status === 'completed' ? 'text-green-400' : 
                                    activeSession.status === 'failed' ? 'text-red-400' : 
                                    'text-white'
                                }`}>
                                    {activeSession.status === 'generating' ? 'Processing...' : activeSession.status.charAt(0).toUpperCase() + activeSession.status.slice(1)}
                                    
                                    {activeSession.status === 'generating' && (
                                    <button 
                                        onClick={() => stopGeneration(activeSession.id)}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-bold px-4 py-1.5 rounded-full border border-red-500/30 transition-all uppercase tracking-widest"
                                    >
                                        Kill Task
                                    </button>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-mono text-white tracking-tighter">
                                {activeSession.generatedImages.length}<span className="text-slate-700 text-2xl">/{activeSession.totalTarget}</span>
                                </div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Samples Generated</div>
                            </div>
                        </div>
                        
                        <div className="h-2.5 bg-slate-950/60 rounded-full overflow-hidden mb-8 relative z-10 shadow-inner ring-1 ring-white/5">
                            <div 
                                className={`h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${activeSession.status === 'stopped' ? 'bg-slate-700' : 'bg-gradient-to-r from-primary-600 via-indigo-500 to-purple-600'}`}
                                style={{ width: `${activeSession.progress}%` }}
                            ></div>
                        </div>

                         <div className="bg-black/40 rounded-2xl p-5 font-mono text-[10px] text-slate-400 h-32 overflow-y-auto border border-slate-800 shadow-inner custom-scrollbar">
                            {activeSession.logs.map((log, i) => (
                                <div key={i} className="mb-1.5 leading-relaxed flex gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                  <span className="text-slate-600 shrink-0">{log.split(']')[0]}]</span>
                                  <span className="text-slate-300">{log.split(']')[1]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter By Tags</div>
                            {uniqueTags.length > 0 ? (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setActiveFilterTag(null)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${!activeFilterTag ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                  >
                                    ALL
                                  </button>
                                  {uniqueTags.map(tag => (
                                    <button 
                                      key={tag}
                                      onClick={() => setActiveFilterTag(tag)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeFilterTag === tag ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                    >
                                      {tag.toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                            ) : (
                              <div className="text-[10px] text-slate-700 italic">No tags defined yet</div>
                            )}
                        </div>
                        {filteredImages.length > 0 && (
                            <button 
                                onClick={downloadVisible}
                                className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition-all shadow-xl shadow-black/40"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                EXPORT SAMPLES
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredImages.map((img) => (
                            <div 
                                key={img.id} 
                                onClick={() => setEditingImage(img)}
                                className="group relative aspect-square bg-slate-900 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-primary-500/50 transition-all duration-500 cursor-pointer flex items-center justify-center hover:shadow-2xl hover:shadow-primary-500/10 active:scale-[0.98] shadow-lg ring-1 ring-white/5"
                            >
                                <img src={img.url} alt="gen" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                {img.tags.length > 0 && (
                                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap max-w-[calc(100%-24px)] z-10">
                                    {img.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="bg-black/80 backdrop-blur-xl text-white text-[9px] font-bold px-2 py-0.5 rounded-lg border border-white/10 uppercase tracking-tighter">
                                        {tag}
                                        </span>
                                    ))}
                                    {img.tags.length > 2 && <span className="bg-black/80 text-white text-[9px] px-2 py-0.5 rounded-lg">+{img.tags.length - 2}</span>}
                                </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-5">
                                   <div className="text-[10px] font-bold text-white bg-primary-600 px-4 py-2 rounded-xl shadow-2xl tracking-widest w-full text-center transform translate-y-2 group-hover:translate-y-0 transition-transform">ANNOTATE</div>
                                </div>
                            </div>
                        ))}
                        {activeSession.status === 'generating' && !activeFilterTag && Array.from({ length: Math.max(0, activeSession.totalTarget - activeSession.generatedImages.length) }).map((_, i) => (
                            <div key={`skel-${i}`} className="aspect-square bg-slate-900/20 rounded-2xl border border-slate-800/40 flex flex-col items-center justify-center animate-pulse gap-3">
                                <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-primary-500 animate-spin"></div>
                                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Synthesizing...</span>
                            </div>
                        ))}
                    </div>

                     {/* PROMPT VARIATIONS LOG */}
                     <div className="mt-20 pt-10 border-t border-slate-800/40">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                           </div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Diversity Mapping Prompts</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {activeSession.generatedPrompts.map((p, i) => (
                                <div key={i} className="text-[11px] text-slate-500 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 hover:border-slate-700 hover:text-slate-300 transition-all group relative overflow-hidden" title={p}>
                                    <div className="flex gap-3 items-start">
                                      <span className="text-primary-500 font-mono text-[10px] shrink-0 mt-0.5 font-bold">#{String(i + 1).padStart(2, '0')}</span>
                                      <p className="leading-relaxed line-clamp-2">{p}</p>
                                    </div>
                                    <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                             ))}
                        </div>
                     </div>
                </div>
            )}

            {!activeSession && (
                <div className="h-[60vh] flex flex-col items-center justify-center text-slate-600 space-y-6 animate-in fade-in duration-1000">
                    <div className="w-20 h-20 border border-slate-800/40 rounded-3xl flex items-center justify-center text-slate-800 relative group">
                        <div className="absolute inset-0 bg-primary-500/5 rounded-3xl blur-xl group-hover:bg-primary-500/10 transition-colors"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="z-10 text-slate-700"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-bold tracking-[0.1em] text-slate-500 uppercase">Awaiting Dataset Definition</p>
                      <p className="text-xs text-slate-700 max-w-xs mx-auto leading-relaxed">Provide scenario description and reference images to launch the synthesis pipeline.</p>
                    </div>
                </div>
            )}
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        configs={modelConfigs}
        activeConfigId={activeModelId}
        onSaveConfig={(config) => setModelConfigs(prev => [...prev, config])}
        onSelectActive={(id) => setActiveModelId(id)}
      />

      <ImageEditorModal 
        image={editingImage} 
        onClose={() => setEditingImage(null)}
        onSave={handleImageSave}
      />
    </div>
  );
};

export default App;