
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { UserSession, CallStatus, Participant, ChatMessage } from '../types';
import VideoTile from './VideoTile';
import Controls from './Controls';
import ParticipantsPanel from './ParticipantsPanel';
import ChatPanel from './ChatPanel';
import { WebRTCService } from '../services/webrtc';
import { SignalingService, SignalPayload } from '../services/socket';

interface MeetingRoomProps {
  session: UserSession;
  onLeave: () => void;
  onStatusChange: (status: CallStatus) => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ session, onLeave, onStatusChange }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [accessRequest, setAccessRequest] = useState<{ fromId: string, fromName: string } | null>(null);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Map<string, string>>(new Map());
  
  const peers = useRef<Map<string, WebRTCService>>(new Map());
  const sigService = useRef<SignalingService>(SignalingService.getInstance());
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleSignaling = async (msg: SignalPayload) => {
    switch (msg.type) {
      case 'JOIN':
        createPeer(msg.senderId, msg.senderName, true);
        break;
      case 'OFFER':
        const peerOffer = createPeer(msg.senderId, msg.senderName, false);
        const answer = await peerOffer.handleOffer(msg.data);
        sigService.current.sendSignal({
          type: 'ANSWER', senderId: session.userId, senderName: session.displayName,
          roomId: session.roomId, targetId: msg.senderId, data: answer
        });
        break;
      case 'ANSWER':
        peers.current.get(msg.senderId)?.handleAnswer(msg.data);
        break;
      case 'CANDIDATE':
        peers.current.get(msg.senderId)?.addIceCandidate(msg.data);
        break;
      case 'SCREEN_STATUS':
        setParticipants(prev => prev.map(p => 
          p.id === msg.senderId ? { ...p, isScreenSharing: msg.data } : p
        ));
        break;
      case 'METADATA':
        setParticipants(prev => prev.map(p => 
          p.id === msg.senderId ? { ...p, isAudioOn: msg.data.audio, isVideoOn: msg.data.video } : p
        ));
        break;
      case 'ACCESS_REQUEST':
        setAccessRequest({ fromId: msg.senderId, fromName: msg.senderName });
        break;
      case 'ACCESS_GRANTED':
        setParticipants(prev => prev.map(p => 
          p.id === msg.senderId ? { ...p, isControlGranted: true } : p
        ));
        break;
      case 'REMOTE_COMMAND':
        handleRemoteCommand(msg.data);
        break;
      case 'CHAT':
        setMessages(prev => [...prev, { ...msg.data, isLocal: false }]);
        break;
      case 'REACTION':
        setReactions(prev => new Map(prev).set(msg.senderId, msg.data));
        break;
      case 'LEAVE':
        peers.current.get(msg.senderId)?.close();
        peers.current.delete(msg.senderId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(msg.senderId);
          return next;
        });
        setParticipants(prev => prev.filter(p => p.id !== msg.senderId));
        break;
    }
  };

  const handleRemoteCommand = (command: { action: 'toggleMic' | 'toggleVideo' | 'startScreen' }) => {
    if (command.action === 'toggleMic') {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      localStream?.getAudioTracks().forEach(t => t.enabled = !nextMute);
    } else if (command.action === 'toggleVideo') {
      const nextVideo = !isVideoOff;
      setIsVideoOff(nextVideo);
      localStream?.getVideoTracks().forEach(t => t.enabled = !nextVideo);
    } else if (command.action === 'startScreen') {
      toggleScreenShare();
    }
    broadcastMetadata();
  };

  const broadcastMetadata = useCallback(() => {
    sigService.current.sendSignal({
      type: 'METADATA',
      senderId: session.userId,
      senderName: session.displayName,
      roomId: session.roomId,
      data: { audio: !isMuted, video: !isVideoOff }
    });
  }, [isMuted, isVideoOff, session]);

  const createPeer = (targetId: string, name: string, shouldOffer: boolean) => {
    if (peers.current.has(targetId)) return peers.current.get(targetId)!;
    const peer = new WebRTCService(
      (stream) => setRemoteStreams(prev => new Map(prev).set(targetId, stream)),
      (candidate) => sigService.current.sendSignal({
        type: 'CANDIDATE', senderId: session.userId, senderName: session.displayName,
        roomId: session.roomId, targetId, data: candidate
      })
    );
    if (localStreamRef.current) peer.addTracks(localStreamRef.current);
    peers.current.set(targetId, peer);
    setParticipants(prev => [...prev.filter(p => p.id !== targetId), {
      id: targetId, name, isLocal: false, isVideoOn: true, isAudioOn: true, isHost: false, networkQuality: 'good'
    }]);
    if (shouldOffer) {
      peer.createOffer().then(offer => {
        sigService.current.sendSignal({
          type: 'OFFER', senderId: session.userId, senderName: session.displayName,
          roomId: session.roomId, targetId, data: offer
        });
      });
    }
    return peer;
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsScreenSharing(true);
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.onended = () => stopScreenSharing();
        for (const peer of peers.current.values()) await peer.replaceVideoTrack(videoTrack);
        sigService.current.sendSignal({ type: 'SCREEN_STATUS', senderId: session.userId, senderName: session.displayName, roomId: session.roomId, data: true });
      } else {
        await stopScreenSharing();
      }
    } catch (err) { console.error("Screen share failed", err); }
  };

  const stopScreenSharing = async () => {
    screenStream?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      for (const peer of peers.current.values()) await peer.replaceVideoTrack(cameraTrack);
    }
    sigService.current.sendSignal({ type: 'SCREEN_STATUS', senderId: session.userId, senderName: session.displayName, roomId: session.roomId, data: false });
  };

  const grantAccess = () => {
    if (accessRequest) {
      sigService.current.sendSignal({
        type: 'ACCESS_GRANTED',
        senderId: session.userId,
        senderName: session.displayName,
        roomId: session.roomId,
        targetId: accessRequest.fromId
      });
      setAccessRequest(null);
    }
  };

  const requestControl = (targetId: string) => {
    sigService.current.sendSignal({
      type: 'ACCESS_REQUEST',
      senderId: session.userId,
      senderName: session.displayName,
      roomId: session.roomId,
      targetId: targetId
    });
  };

  const sendRemoteCommand = (targetId: string, action: 'toggleMic' | 'toggleVideo' | 'startScreen') => {
    sigService.current.sendSignal({
      type: 'REMOTE_COMMAND',
      senderId: session.userId,
      senderName: session.displayName,
      roomId: session.roomId,
      targetId: targetId,
      data: { action }
    });
  };

  // Fixed Error: Added missing sendMessage function to properly handle ChatPanel submissions
  const sendMessage = (text: string) => {
    const message: ChatMessage = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      senderId: session.userId,
      senderName: session.displayName,
      text,
      timestamp: Date.now(),
      isLocal: true
    };
    setMessages(prev => [...prev, message]);
    sigService.current.sendSignal({
      type: 'CHAT',
      senderId: session.userId,
      senderName: session.displayName,
      roomId: session.roomId,
      data: message
    });
  };

  useEffect(() => {
    const init = async () => {
      onStatusChange(CallStatus.CONNECTING);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
        setParticipants([{ id: session.userId, name: session.displayName, isLocal: true, isVideoOn: true, isAudioOn: true, isHost: session.isHost }]);
        sigService.current.joinRoom(session.roomId, session.userId, session.displayName, handleSignaling);
        onStatusChange(CallStatus.CONNECTED);
      } catch (e) { onStatusChange(CallStatus.DISCONNECTED); }
    };
    init();
    return () => {
      sigService.current.leaveRoom(session.roomId, session.userId);
      peers.current.forEach(p => p.close());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center relative overflow-hidden">
      
      {/* Remote Access Prompt */}
      {accessRequest && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/30 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-shield-halved text-blue-500 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Admin Control Request</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              <span className="text-blue-400 font-bold">{accessRequest.fromName}</span> (Host) is requesting permission to manage your camera and microphone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccessRequest(null)} className="flex-1 py-3 rounded-xl bg-slate-800 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">Deny</button>
              <button onClick={grantAccess} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all">Allow Access</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Status Badges */}
      <div className="fixed top-24 left-8 z-[60] flex flex-col gap-3 pointer-events-none">
        <div className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-full flex items-center gap-2 backdrop-blur-md">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-blue-400 text-[8px] font-black uppercase tracking-widest">P2P Encrypted Active</span>
        </div>
      </div>

      <div className={`w-full max-w-7xl flex-grow transition-all duration-700 p-4 md:p-10 mb-24 flex gap-6 overflow-hidden h-full`}>
        <div className={`flex-grow grid gap-6 ${isScreenSharing || Array.from(participants).some(p => p.isScreenSharing) ? 'grid-cols-4 grid-rows-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {/* Main Slot */}
          <div className={`${(isScreenSharing || Array.from(participants).some(p => p.isScreenSharing)) ? 'col-span-4 row-span-3 lg:col-span-3 lg:row-span-4 h-full' : 'h-[300px] md:h-[350px]'}`}>
            <VideoTile 
              stream={isScreenSharing ? screenStream : localStream} 
              label={isScreenSharing ? "You (Screen)" : `${session.displayName} (You)`} 
              isLocal isVideoOff={isVideoOff} isMuted={isMuted} isScreenSharing={isScreenSharing}
              reaction={reactions.get(session.userId)}
            />
          </div>

          {/* Remote Slots */}
          {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
            const pData = participants.find(p => p.id === peerId);
            return (
              <div key={peerId} className={`${(isScreenSharing || Array.from(participants).some(p => p.isScreenSharing)) ? 'col-span-1 row-span-1 h-[120px] lg:h-auto' : 'h-[300px] md:h-[350px]'}`}>
                <VideoTile 
                  stream={stream} 
                  label={pData?.name || "Participant"} 
                  reaction={reactions.get(peerId)}
                  isMuted={!pData?.isAudioOn}
                  isVideoOff={!pData?.isVideoOn}
                  isScreenSharing={pData?.isScreenSharing}
                />
              </div>
            );
          })}
        </div>

        {showChat && (
          <div className="hidden lg:flex w-80 lg:w-96 flex-col gap-4 animate-in slide-in-from-right-4 duration-500">
            <ChatPanel messages={messages} onSendMessage={sendMessage} onSendReaction={(e) => setReactions(prev => new Map(prev).set(session.userId, e))} />
          </div>
        )}
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 px-4 gap-3">
        <Controls 
          isMuted={isMuted} isVideoOff={isVideoOff} isScreenSharing={isScreenSharing} isHandRaised={false}
          showParticipants={showParticipants} 
          onToggleMute={() => { const next = !isMuted; setIsMuted(next); localStream?.getAudioTracks().forEach(t => t.enabled = !next); broadcastMetadata(); }}
          onToggleVideo={() => { const next = !isVideoOff; setIsVideoOff(next); localStream?.getVideoTracks().forEach(t => t.enabled = !next); broadcastMetadata(); }} 
          onToggleScreenShare={toggleScreenShare}
          onToggleHandRaise={() => {}}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onLeave={onLeave} roomId={session.roomId} participantCount={participants.length}
        />
        
        <button onClick={() => setShowChat(!showChat)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${showChat ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-slate-900 border-white/10'}`}>
          <i className="fas fa-comments text-blue-400 text-lg"></i>
        </button>
      </div>

      <ParticipantsPanel 
        isOpen={showParticipants} 
        participants={participants} 
        onClose={() => setShowParticipants(false)}
        isHost={session.isHost}
        onRequestControl={requestControl}
        onRemoteCommand={sendRemoteCommand}
      />
    </div>
  );
};

export default MeetingRoom;
