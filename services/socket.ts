
import { Peer, DataConnection } from 'peerjs';

export type SignalPayload = {
  type: 'JOIN' | 'LEAVE' | 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'METADATA' | 'SCREEN_STATUS' | 'CHAT' | 'REACTION' | 'ACCESS_REQUEST' | 'ACCESS_GRANTED' | 'REMOTE_COMMAND';
  senderId: string;
  senderName: string;
  roomId: string;
  targetId?: string;
  data?: any;
};

export class SignalingService {
  private static instance: SignalingService;
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private onMessageCallback: ((msg: SignalPayload) => void) | null = null;
  private userId: string = '';
  private roomId: string = '';

  static getInstance() {
    if (!this.instance) this.instance = new SignalingService();
    return this.instance;
  }

  joinRoom(roomId: string, userId: string, displayName: string, isHost: boolean, onMessage: (msg: SignalPayload) => void) {
    this.onMessageCallback = onMessage;
    this.userId = userId;
    this.roomId = roomId.toUpperCase();

    // Host uses RoomID as PeerID so others can find it.
    // Participants use a random unique ID to prevent conflicts on the same network.
    const peerId = isHost ? `OMNI_ROOM_${this.roomId}` : `OMNI_USER_${userId}_${Math.floor(Math.random() * 10000)}`;
    
    this.peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' }
        ]
      }
    });

    (this.peer as any).on('open', (id: string) => {
      console.log('Signal Layer Ready. ID:', id);
      if (!isHost) {
        this.connectToHost();
      }
    });

    (this.peer as any).on('connection', (conn: DataConnection) => {
      this.setupConnection(conn);
    });

    (this.peer as any).on('error', (err: any) => {
      console.error('Signaling Error:', err.type);
      if (err.type === 'peer-unavailable' && !isHost) {
        // Retry connection if host is not yet online
        setTimeout(() => this.connectToHost(), 3000);
      }
    });
  }

  private connectToHost() {
    if (!this.peer || this.peer.destroyed) return;
    const hostId = `OMNI_ROOM_${this.roomId}`;
    const conn = this.peer.connect(hostId, {
      metadata: { userId: this.userId, name: 'Participant' }
    });
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
    (conn as any).on('open', () => {
      this.connections.set(conn.peer, conn);
      // Immediately announce presence to trigger Offer/Answer flow
      this.sendSignal({
        type: 'JOIN',
        senderId: this.userId,
        senderName: '',
        roomId: this.roomId
      });
    });

    (conn as any).on('data', (data: any) => {
      const msg = data as SignalPayload;
      
      // Relay logic: Host acts as the central router (SFU-like)
      if (this.peer?.id.startsWith('OMNI_ROOM_')) {
        if (msg.targetId && msg.targetId !== this.userId) {
          this.relayToTarget(msg);
          return;
        } else if (!msg.targetId) {
          this.broadcastToOthers(msg, conn.peer);
        }
      }

      this.onMessageCallback?.(msg);
    });

    (conn as any).on('close', () => {
      this.connections.delete(conn.peer);
    });
  }

  private relayToTarget(msg: SignalPayload) {
    const target = Array.from(this.connections.values()).find(c => c.peer.includes(msg.targetId!));
    if (target) target.send(msg);
  }

  private broadcastToOthers(msg: SignalPayload, skipPeer: string) {
    this.connections.forEach(conn => {
      if (conn.peer !== skipPeer) conn.send(msg);
    });
  }

  sendSignal(payload: SignalPayload) {
    if (payload.targetId) {
      const target = Array.from(this.connections.values()).find(c => c.peer.includes(payload.targetId!));
      if (target) {
        target.send(payload);
        return;
      }
    }
    this.connections.forEach(conn => conn.send(payload));
  }

  leaveRoom() {
    this.connections.forEach(c => c.close());
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}
