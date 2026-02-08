import React, { useState } from 'react';
import { Session } from '../types';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewSession,
  onDeleteSession
}) => {
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [pinnedSessionId, setPinnedSessionId] = useState<string | null>(null);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedSessionId(pinnedSessionId === id ? null : id);
  };

  const showDetailsId = pinnedSessionId || hoveredSessionId;
  const detailedSession = sessions.find(s => s.id === showDetailsId);

  return (
    <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 z-20 relative">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2v20"/><path d="m5 9 7-7 7 7"/><path d="m19 15-7 7-7-7"/></svg>
          </div>
          <span>Synth<span className="text-primary-500">Vision</span></span>
        </h1>
        <button 
          onClick={onNewSession}
          className="p-2 bg-slate-800 hover:bg-primary-600 rounded-lg text-white transition-all hover:scale-105 active:scale-95 border border-slate-700 hover:border-primary-500"
          title="New Task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">History</div>
        {sessions.length === 0 && (
          <div className="text-slate-600 text-xs text-center mt-12 px-4 italic leading-relaxed">
            Your generation history will appear here.
          </div>
        )}
        {sessions.map(session => (
          <div 
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            onMouseEnter={() => setHoveredSessionId(session.id)}
            onMouseLeave={() => setHoveredSessionId(null)}
            className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
              activeSessionId === session.id 
                ? 'bg-slate-800/80 border-primary-500/50 shadow-lg shadow-black/40 ring-1 ring-primary-500/20' 
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className={`text-sm font-medium truncate pr-4 transition-colors ${activeSessionId === session.id ? 'text-white' : 'text-slate-300'}`}>
                {session.name || 'Untitled Task'}
              </h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => togglePin(e, session.id)}
                  className={`p-1.5 rounded-md transition-colors ${pinnedSessionId === session.id ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-700 hover:text-slate-200'}`}
                  title="View Details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </button>
                <button
                  onClick={(e) => onDeleteSession(e, session.id)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-500 font-mono">{new Date(session.createdAt).toLocaleDateString()}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'completed' ? 'bg-green-500' : session.status === 'generating' ? 'bg-primary-500 animate-pulse' : 'bg-slate-700'}`}></span>
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{session.generatedImages.length} Samples</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Prompt Preview - Positioning avoids obstructing main view by using a fly-out card */}
      {detailedSession && (
        <div 
          className="absolute left-[calc(100%+12px)] top-4 w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-left-4 duration-300 ring-1 ring-white/5"
          onMouseEnter={() => setHoveredSessionId(detailedSession.id)}
          onMouseLeave={() => setHoveredSessionId(null)}
        >
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Configuration Details</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => navigator.clipboard.writeText(detailedSession.basePrompt)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md transition-colors"
                title="Copy Prompt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              {pinnedSessionId === detailedSession.id && (
                <button 
                  onClick={() => setPinnedSessionId(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Original Request</span>
              <div className="bg-black/40 rounded-xl p-4 border border-slate-800 max-h-64 overflow-y-auto">
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {detailedSession.basePrompt}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block mb-1">Target Count</span>
                <span className="text-sm font-mono text-white">{detailedSession.totalTarget} Images</span>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block mb-1">Status</span>
                <span className={`text-sm font-bold uppercase tracking-tighter ${detailedSession.status === 'completed' ? 'text-green-500' : 'text-primary-500'}`}>{detailedSession.status}</span>
              </div>
            </div>
          </div>
          
          {pinnedSessionId === detailedSession.id && (
            <div className="mt-6 text-[10px] text-slate-600 text-center italic">
              Click the 'x' or pin icon to close
            </div>
          )}
        </div>
      )}
      
      <div className="p-4 border-t border-slate-800 bg-slate-900/20">
        <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono tracking-tighter">
          <span>FORGE_V1.3</span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-green-500 rounded-full"></span>
            ENGINE_READY
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;