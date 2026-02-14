
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
  private channel: BroadcastChannel | null = null;
  private onMessageCallback: ((msg: SignalPayload) => void) | null = null;

  static getInstance() {
    if (!this.instance) this.instance = new SignalingService();
    return this.instance;
  }

  joinRoom(roomId: string, userId: string, displayName: string, onMessage: (msg: SignalPayload) => void) {
    this.onMessageCallback = onMessage;
    if (this.channel) this.channel.close();
    
    this.channel = new BroadcastChannel(`omni-rtc-room-${roomId}`);
    this.channel.onmessage = (event) => {
      const msg = event.data as SignalPayload;
      if (msg.senderId !== userId && (!msg.targetId || msg.targetId === userId)) {
        this.onMessageCallback?.(msg);
      }
    };

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
