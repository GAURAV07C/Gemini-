
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
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isControlGranted?: boolean; // New: If this participant has allowed the host to control them
  isHost: boolean;
  networkQuality?: 'excellent' | 'good' | 'poor';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export interface RecentRoom {
  roomId: string;
  displayName: string;
  isHost: boolean;
  timestamp: number;
}

// Added AISummary interface to fix import error in AISidebar.tsx
export interface AISummary {
  text: string;
  timestamp: number;
}
