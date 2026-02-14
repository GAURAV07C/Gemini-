
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
  private connections: Map<string, DataConnection> = new Map(); // Maps PeerID to Connection
  private userIdToPeerId: Map<string, string> = new Map(); // Maps UserID to PeerID
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

    const peerId = isHost ? `OMNI_ROOM_${this.roomId}` : `OMNI_USER_${userId}_${Math.floor(Math.random() * 10000)}`;
    
    this.peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      console.log('[Socket] Signal Layer Ready. ID:', id);
      if (!isHost) {
        this.connectToHost();
      }
    });

    this.peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('[Socket] Signaling Error:', err.type);
      if (err.type === 'peer-unavailable' && !isHost) {
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
    conn.on('open', () => {
      const connMetadata = conn.metadata as { userId?: string };
      if (connMetadata?.userId) {
        this.userIdToPeerId.set(connMetadata.userId, conn.peer);
      }
      this.connections.set(conn.peer, conn);
      
      this.sendSignal({
        type: 'JOIN',
        senderId: this.userId,
        senderName: '',
        roomId: this.roomId
      });
    });

    conn.on('data', (data) => {
      const msg = data as SignalPayload;
      
      // Map sender's user ID to their peer ID if we don't have it
      if (msg.senderId) {
        this.userIdToPeerId.set(msg.senderId, conn.peer);
      }

      // Relay logic: Host acts as the central router
      const isHost = this.peer?.id.startsWith('OMNI_ROOM_');
      if (isHost) {
        if (msg.targetId && msg.targetId !== this.userId) {
          this.relayToTarget(msg);
          // Also process for self if host is the target or if it's a broadcast
          if (msg.targetId === this.userId) this.onMessageCallback?.(msg);
          return;
        } else if (!msg.targetId) {
          this.broadcastToOthers(msg, conn.peer);
        }
      }

      this.onMessageCallback?.(msg);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      // Clean up mapping
      for (const [uid, pid] of this.userIdToPeerId.entries()) {
        if (pid === conn.peer) this.userIdToPeerId.delete(uid);
      }
    });
  }

  private relayToTarget(msg: SignalPayload) {
    const peerId = this.userIdToPeerId.get(msg.targetId!);
    if (peerId) {
      const targetConn = this.connections.get(peerId);
      if (targetConn) targetConn.send(msg);
    } else {
      // Fallback to searching connections by partial match
      const target = Array.from(this.connections.values()).find(c => c.peer.includes(msg.targetId!));
      if (target) target.send(msg);
    }
  }

  private broadcastToOthers(msg: SignalPayload, skipPeer: string) {
    this.connections.forEach(conn => {
      if (conn.peer !== skipPeer) conn.send(msg);
    });
  }

  sendSignal(payload: SignalPayload) {
    if (payload.targetId) {
      const peerId = this.userIdToPeerId.get(payload.targetId);
      if (peerId) {
        const target = this.connections.get(peerId);
        if (target) {
          target.send(payload);
          return;
        }
      }
      // Fallback
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
    this.userIdToPeerId.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}
