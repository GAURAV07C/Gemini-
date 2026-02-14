
export enum CallStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DISCONNECTED = 'DISCONNECTED'
}

export interface UserSession {
  userId: string;
  roomId: string;
  displayName: string;
  lastActive: number;
  isHost: boolean;
}

export interface Participant {
  id: string;
  name: string;
  isLocal: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isHandRaised?: boolean;
  isManaged?: boolean;
  isHost: boolean;
  networkQuality?: 'excellent' | 'good' | 'poor';
  bitrate?: string;
  audioLevel?: number;
}

export interface AISummary {
  timestamp: number;
  text: string;
  type: 'insight' | 'action-item';
}

export interface TranscriptionEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

export interface SFUSignalMessage {
  type: 'getRouterRtpCapabilities' | 'createWebRtcTransport' | 'connectWebRtcTransport' | 'produce' | 'consume' | 'newProducer';
  data: any;
  from: string;
  roomId: string;
}

export interface RecentRoom {
  roomId: string;
  displayName: string;
  isHost: boolean;
  timestamp: number;
}
