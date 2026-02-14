
import React, { useRef, useEffect } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isManaged?: boolean;
  isHost?: boolean;
  networkQuality?: 'excellent' | 'good' | 'poor';
}

const VideoTile: React.FC<VideoTileProps> = ({ 
  stream, label, isLocal, isMuted, isVideoOff, 
  isScreenSharing, isHandRaised, isHost, networkQuality = 'good'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
      }
    }
  }, [stream, isVideoOff, isScreenSharing]);

  const getQualityColor = () => {
    switch(networkQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div 
      className={`relative h-full w-full bg-slate-900 rounded-3xl overflow-hidden border border-white/5 transition-all duration-500 ${isScreenSharing ? 'ring-4 ring-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.2)]' : ''}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
      />

      {/* Network Health & SFU Badges */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
          <div className={`bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5 ${getQualityColor()}`}>
             <i className="fas fa-signal text-[8px]"></i>
             <span className="text-[7px] font-black uppercase tracking-tighter">{networkQuality}</span>
          </div>
      </div>

      {/* Identity Label */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-slate-950/60 backdrop-blur-lg border border-white/10 px-3 py-2 rounded-xl flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-white text-[10px] font-black uppercase tracking-tight leading-none">{label}</span>
            <div className="flex items-center gap-1.5 mt-1">
               <div className="w-1 h-1 bg-green-500 rounded-full"></div>
               <span className="text-gray-500 text-[7px] font-bold uppercase tracking-widest">SFU Stream</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Muted Overlay */}
      {isVideoOff && (
        <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 border border-white/5">
                <i className="fas fa-user text-2xl"></i>
            </div>
            <p className="mt-4 text-white text-[9px] font-black uppercase tracking-[0.3em]">{label}</p>
        </div>
      )}
    </div>
  );
};

export default VideoTile;
