
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  public pc: RTCPeerConnection;
  private onTrackCallback: (stream: MediaStream) => void;
  private onIceCandidateCallback: (candidate: RTCIceCandidate) => void;

  constructor(
    onTrack: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ) {
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.onTrackCallback = onTrack;
    this.onIceCandidateCallback = onIceCandidate;
    this.setupListeners();
  }

  private setupListeners() {
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log("[WebRTC] Stream Received");
        this.onTrackCallback(event.streams[0]);
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] State:", this.pc.iceConnectionState);
    };
  }

  async createOffer() {
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      if (this.pc.signalingState !== 'stable') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (e) { console.error("Answer Error:", e); }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) { /* Ignore candidate errors after connection */ }
  }

  addTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      // Check if track already added
      const senders = this.pc.getSenders();
      if (!senders.find(s => s.track === track)) {
        this.pc.addTrack(track, stream);
      }
    });
  }

  async replaceVideoTrack(newTrack: MediaStreamTrack) {
    const senders = this.pc.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(newTrack);
    }
  }

  close() {
    this.pc.close();
  }
}
