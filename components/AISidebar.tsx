
import React from 'react';
import { AISummary } from '../types';

interface AISidebarProps {
  isOpen: boolean;
  summaries: AISummary[];
  onClose: () => void;
}

const AISidebar: React.FC<AISidebarProps> = ({ isOpen, summaries, onClose }) => {
  return (
    <div className={`fixed right-0 top-20 bottom-0 w-80 glass-effect border-l border-purple-500/20 z-40 transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full shadow-[-20px_0_50px_rgba(168,85,247,0.1)]'}`}>
      <div className="h-full flex flex-col p-6 bg-purple-500/5 backdrop-blur-3xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
              <i className="fas fa-wand-magic-sparkles text-white text-xs"></i>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">AI Copilot</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {summaries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <i className="fas fa-brain text-4xl mb-4 text-purple-400"></i>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Waiting for discussion to summarize...</p>
            </div>
          ) : (
            summaries.map((s, idx) => (
              <div key={idx} className="bg-slate-900/80 border border-purple-500/10 p-4 rounded-2xl animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Live Insight</span>
                  <span className="text-[7px] text-gray-600 font-mono italic">{new Date(s.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">{s.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-purple-600/10 rounded-xl border border-purple-500/20">
          <p className="text-[8px] text-purple-300 font-bold uppercase tracking-widest mb-1">Status</p>
          <p className="text-[10px] text-gray-400">Gemini 3 Flash Pro active. Analyzing real-time RTP streams.</p>
        </div>
      </div>
    </div>
  );
};

export default AISidebar;
