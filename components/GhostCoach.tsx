
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const GhostCoach: React.FC = () => {
  const [topic, setTopic] = useState('WEBRTC');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('System ready. Ask anything about WebRTC/Interviews.');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Topic: ${topic}. Question: ${query}. 
                     Format: Minimalist terminal text. Max 100 words. 
                     If it's an interview question, give a 'Senior Dev' answer.`;
      
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setResponse(result.text || "No data.");
    } catch (e) {
      setResponse("Error: Link to brain failed.");
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0c0c0c] text-[#d4d4d4] font-mono text-[11px] p-4 flex flex-col selection:bg-blue-500/30">
      {/* Fake Terminal Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4 opacity-40">
        <span className="uppercase tracking-[0.2em] font-bold">omnirtc_sidekick_v1.0</span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
          <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
        </div>
      </div>

      {/* Logic Toggles */}
      <div className="flex gap-4 mb-4 border-b border-white/5 pb-4">
        {['WEBRTC', 'SYSTEM_DESIGN', 'SOFT_SKILLS'].map(t => (
          <button 
            key={t}
            onClick={() => setTopic(t)}
            className={`transition-colors uppercase tracking-widest font-black ${topic === t ? 'text-blue-500' : 'text-gray-700 hover:text-gray-500'}`}
          >
            [{t}]
          </button>
        ))}
      </div>

      {/* Display Area */}
      <div className="flex-grow overflow-y-auto mb-4 custom-scrollbar leading-relaxed">
        <div className="text-blue-600 mb-2 font-black uppercase tracking-tighter">$ ANALYZING_CONTEXT... DONE</div>
        <div className="whitespace-pre-wrap">{loading ? "Fetching from neural net..." : response}</div>
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-500 font-black tracking-widest">{">"}</span>
          <input 
            autoFocus
            className="bg-transparent border-none outline-none flex-grow placeholder:text-gray-800 text-[#d4d4d4]"
            placeholder="TYPE_QUESTION_HERE"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAI()}
          />
        </div>
      </div>

      {/* Safety Warning (Visible only to User) */}
      <div className="mt-4 pt-2 border-t border-white/5 text-[9px] text-gray-800 font-black italic">
        STEALTH_ACTIVE: SHARE_TAB_ONLY_DURING_MEETING
      </div>
    </div>
  );
};

export default GhostCoach;
