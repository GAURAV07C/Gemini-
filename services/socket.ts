
import { SFUSignalMessage } from '../types';

export type SignalPayload = {
  type: 'JOIN' | 'LEAVE' | 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'METADATA';
  senderId: string;
  senderName: string;
  roomId: string;
  data?: any;
};

export class SignalingService {
  private static instance: SignalingService;
  private channel: BroadcastChannel | null = null;
  private onMessageCallback: ((msg: SignalPayload) => void) | null = null;

  static getInstance() {
    if (!this.instance) this.instance = new SignalingService();
    return this.instance;
  }

  joinRoom(roomId: string, userId: string, displayName: string, onMessage: (msg: SignalPayload) => void) {
    this.onMessageCallback = onMessage;
    
    // Close existing channel if any
    if (this.channel) this.channel.close();
    
    // Create a unique channel for this room
    this.channel = new BroadcastChannel(`omni-rtc-room-${roomId}`);
    
    this.channel.onmessage = (event) => {
      const msg = event.data as SignalPayload;
      if (msg.senderId !== userId) { // Don't process our own messages
        this.onMessageCallback?.(msg);
      }
    };

    // Broadcast that we have joined
    this.sendSignal({
      type: 'JOIN',
      senderId: userId,
      senderName: displayName,
      roomId: roomId
    });
  }

  sendSignal(payload: SignalPayload) {
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  leaveRoom(roomId: string, userId: string) {
    this.sendSignal({
      type: 'LEAVE',
      senderId: userId,
      senderName: '',
      roomId: roomId
    });
    this.channel?.close();
    this.channel = null;
  }
}
