
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { UserSession, CallStatus, Participant, AISummary, TranscriptionEntry } from '../types';
import VideoTile from './VideoTile';
import Controls from './Controls';
import ParticipantsPanel from './ParticipantsPanel';
import AISidebar from './AISidebar';
import { SFUService } from '../services/sfu';
import { SignalingService, SignalPayload } from '../services/socket';
import { GoogleGenAI, Type } from "@google/genai";

interface MeetingRoomProps {
  session: UserSession;
  onLeave: () => void;
  onStatusChange: (status: CallStatus) => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ session, onLeave, onStatusChange }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [aiSummaries, setAiSummaries] = useState<AISummary[]>([]);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [sfuStatus, setSfuStatus] = useState<'IDLE' | 'ROUTING' | 'OPTIMIZED'>('IDLE');

  const sfuService = useRef<SFUService | null>(null);
  const sigService = useRef<SignalingService>(SignalingService.getInstance());
  const transcriptionInterval = useRef<number | null>(null);

  const handleRemoteTrack = useCallback((track: MediaStreamTrack, peerId: string) => {
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      const stream = new MediaStream([track]);
      newMap.set(peerId, stream);
      return newMap;
    });
  }, []);

  const addParticipant = (id: string, name: string, isHost: boolean = false) => {
    setParticipants(prev => {
      if (prev.find(p => p.id === id)) return prev;
      return [...prev, {
        id,
        name,
        isLocal: false,
        isVideoOn: true,
        isAudioOn: true,
        isHost,
        networkQuality: 'good',
        bitrate: '2.4 Mbps'
      }];
    });
    
    // SFU: Automatically start consuming remote stream
    sfuService.current?.consume('p_video_remote', id);
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const handleSignaling = (msg: SignalPayload) => {
    switch (msg.type) {
      case 'JOIN':
        // New peer joined, tell them who we are
        addParticipant(msg.senderId, msg.senderName);
        sigService.current.sendSignal({
          type: 'METADATA',
          senderId: session.userId,
          senderName: session.displayName,
          roomId: session.roomId,
          data: { isHost: session.isHost }
        });
        break;
      case 'METADATA':
        // Received info from existing peer
        addParticipant(msg.senderId, msg.senderName, msg.data?.isHost);
        break;
      case 'LEAVE':
        removeParticipant(msg.senderId);
        break;
    }
  };

  const generateMeetingInsights = async (textFeed: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Meeting transcript: "${textFeed}". Summary and 1 Action Item. JSON: {pulse, actionItem}`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pulse: { type: Type.STRING },
              actionItem: { type: Type.STRING }
            },
            required: ["pulse", "actionItem"]
          }
        }
      });
      const result = JSON.parse(response.text || '{}');
      // Fix: Added 'as const' to string literals to prevent widening to 'string' type which caused a mismatch with AISummary interface
      setAiSummaries(prev => [
        { timestamp: Date.now(), text: result.pulse, type: 'insight' as const },
        { timestamp: Date.now(), text: `Action: ${result.actionItem}`, type: 'action-item' as const },
        ...prev
      ].slice(0, 20));
    } catch (err) { console.error("AI Insight failed", err); }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        onStatusChange(CallStatus.CONNECTING);
        sfuService.current = new SFUService(handleRemoteTrack);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        setSfuStatus('ROUTING');
        await sfuService.current.initializeDevice({ codecs: ['vp8', 'opus'] });
        await sfuService.current.createSendTransport({ id: 't_send_local' });
        await sfuService.current.produce(stream.getVideoTracks()[0], 'video');
        
        setSfuStatus('OPTIMIZED');
        onStatusChange(CallStatus.CONNECTED);
        
        setParticipants([{ 
          id: session.userId, 
          name: session.displayName, 
          isLocal: true, 
          isVideoOn: true, 
          isAudioOn: true, 
          isHost: session.isHost,
          networkQuality: 'excellent',
          bitrate: '4.1 Mbps'
        }]);

        // Start real signaling
        sigService.current.joinRoom(session.roomId, session.userId, session.displayName, handleSignaling);

      } catch (err) {
        console.error("Session Init failed:", err);
        onStatusChange(CallStatus.DISCONNECTED);
      }
    };

    initSession();

    transcriptionInterval.current = window.setInterval(() => {
      const entry: TranscriptionEntry = {
        speaker: "Peer",
        text: "Discussing real-time architecture and AI integration.",
        timestamp: Date.now()
      };
      setTranscriptions(prev => {
        const updated = [...prev, entry].slice(-10);
        if (updated.length % 3 === 0) generateMeetingInsights(updated.map(u => u.text).join(' '));
        return updated;
      });
    }, 30000);

    return () => {
      if (transcriptionInterval.current) clearInterval(transcriptionInterval.current);
      sigService.current.leaveRoom(session.roomId, session.userId);
      sfuService.current?.close();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const copyInviteLink = () => {
    const url = window.location.href.split('?')[0];
    navigator.clipboard.writeText(`${url}`);
    alert(`Room ID: ${session.roomId}\nShare this ID with a friend to join!`);
  };

  return (
    <div className="w-full h-full flex flex-col items-center relative overflow-hidden">
      
      <div className="fixed top-24 left-8 z-[60] flex flex-col gap-3">
        {isRecording && (
          <div className="bg-red-500/20 border border-red-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse backdrop-blur-md">
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
            <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">Recording</span>
          </div>
        )}
        <div className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md transition-all duration-500 ${
          sfuStatus === 'OPTIMIZED' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${sfuStatus === 'OPTIMIZED' ? 'bg-green-500 animate-pulse' : 'bg-blue-500 animate-spin'}`}></div>
          SFU CORE: {sfuStatus}
        </div>
      </div>

      {/* Video Grid */}
      <div className={`w-full max-w-7xl flex-grow transition-all duration-700 ease-in-out ${showAI ? 'pr-80 lg:pr-96' : ''} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-10 mb-24`}>
        <div className="h-[280px] md:h-[320px] lg:h-[350px]">
          <VideoTile 
            stream={localStream} label={session.displayName} isLocal isVideoOff={isVideoOff} isMuted={isMuted} isHost={session.isHost} networkQuality="excellent"
          />
        </div>

        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <div key={peerId} className="h-[280px] md:h-[320px] lg:h-[350px]">
            <VideoTile 
              stream={stream} label={participants.find(p => p.id === peerId)?.name || "Remote User"} networkQuality={participants.find(p => p.id === peerId)?.networkQuality || 'good'}
            />
          </div>
        ))}

        {participants.length === 1 && (
          <div className="h-[280px] md:h-[320px] lg:h-[350px] glass-effect rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-6 text-center group cursor-pointer hover:border-blue-500/20 transition-all" onClick={copyInviteLink}>
             <i className="fas fa-user-plus text-blue-500/30 text-3xl mb-4 group-hover:scale-110 transition-transform"></i>
             <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Waiting for others...</p>
             <p className="text-gray-600 text-[9px] font-bold uppercase mb-4">Share Room ID: <span className="text-blue-500 font-mono">{session.roomId}</span></p>
             <div className="bg-blue-600/10 px-5 py-2.5 rounded-xl border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-tighter">Copy Link</div>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 px-4 gap-3">
        <Controls 
          isMuted={isMuted} isVideoOff={isVideoOff} isScreenSharing={isScreenSharing} isHandRaised={false}
          showParticipants={showParticipants} onToggleMute={() => setIsMuted(!isMuted)}
          onToggleVideo={() => setIsVideoOff(!isVideoOff)} onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
          onToggleHandRaise={() => {}}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onLeave={onLeave} roomId={session.roomId} participantCount={participants.length}
        />
        
        <div className="flex gap-2">
          <button onClick={() => setShowAI(!showAI)} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border ${showAI ? 'bg-purple-600 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.4)]' : 'bg-slate-900 border-white/10 hover:bg-slate-800'}`}>
            <i className={`fas fa-wand-magic-sparkles ${showAI ? 'text-white' : 'text-purple-400'} text-lg`}></i>
          </button>
          {session.isHost && (
            <button onClick={() => setIsRecording(!isRecording)} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border ${isRecording ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-slate-900 border-white/10 hover:bg-slate-800'}`}>
              <i className="fas fa-record-vinyl text-white text-lg"></i>
            </button>
          )}
        </div>
      </div>

      <ParticipantsPanel isOpen={showParticipants} participants={participants} onClose={() => setShowParticipants(false)} />
      <AISidebar isOpen={showAI} summaries={aiSummaries} onClose={() => setShowAI(false)} />
    </div>
  );
};

export default MeetingRoom;
