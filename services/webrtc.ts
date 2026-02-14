
/**
 * Senior Engineer's WebRTC Service
 * Encapsulates standard WebRTC logic, STUN config, and track management.
 */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCService {
  private pc: RTCPeerConnection;
  private onTrackCallback: (stream: MediaStream) => void;

  constructor(onTrack: (stream: MediaStream) => void) {
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.onTrackCallback = onTrack;
    this.setupListeners();
  }

  private setupListeners() {
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onTrackCallback(event.streams[0]);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', this.pc.iceConnectionState);
    };
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
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
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  addTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  replaceTrack(newTrack: MediaStreamTrack) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === newTrack.kind);
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  }

  close() {
    this.pc.close();
  }
}
