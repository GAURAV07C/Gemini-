
import React, { useRef, useEffect, useState } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  reaction?: string | null;
  networkQuality?: 'excellent' | 'good' | 'poor';
}

const VideoTile: React.FC<VideoTileProps> = ({ 
  stream, label, isLocal, isMuted, isVideoOff, 
  isScreenSharing, reaction, networkQuality = 'good'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showReaction, setShowReaction] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
      }
    }
  }, [stream, isVideoOff, isScreenSharing]);

  useEffect(() => {
    if (reaction) {
      setShowReaction(true);
      const timer = setTimeout(() => setShowReaction(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [reaction]);

  const getQualityColor = () => {
    switch(networkQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`relative h-full w-full bg-slate-900 rounded-3xl overflow-hidden border border-white/5 transition-all duration-500 shadow-2xl ${isScreenSharing ? 'ring-2 ring-blue-500/50' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover'} transition-transform duration-1000`}
      />

      {/* Floating Reaction */}
      {showReaction && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <span className="text-7xl animate-bounce-slow drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
            {reaction}
          </span>
        </div>
      )}

      {/* Network Badge */}
      <div className="absolute top-4 right-4 z-20">
          <div className={`bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5 flex items-center gap-1.5 ${getQualityColor()}`}>
             <i className="fas fa-signal text-[8px]"></i>
             <span className="text-[7px] font-black uppercase tracking-tighter">{networkQuality}</span>
          </div>
      </div>

      {/* Identity Label */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-white text-[10px] font-black uppercase tracking-tight leading-none">{label}</span>
            <div className="flex items-center gap-1 mt-1">
               <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
               <span className="text-gray-500 text-[6px] font-black uppercase tracking-widest">P2P ENCRYPTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Muted Overlay */}
      {isVideoOff && (
        <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 border border-white/5 shadow-inner">
                <i className="fas fa-user text-2xl"></i>
            </div>
            <p className="mt-4 text-white/30 text-[9px] font-black uppercase tracking-[0.3em] italic">Camera Off</p>
        </div>
      )}

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
          80% { opacity: 1; transform: translateY(-100px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-150px) scale(0.8); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default VideoTile;
