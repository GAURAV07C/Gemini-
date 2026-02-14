
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  public pc: RTCPeerConnection;
  private onTrackCallback: (stream: MediaStream) => void;
  private onIceCandidateCallback: (candidate: RTCIceCandidate) => void;
  private remoteStream: MediaStream | null = null;
  private candidateQueue: RTCIceCandidateInit[] = [];

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
      console.log("[WebRTC] Track received:", event.track.kind, "Streams count:", event.streams.length);
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
      
      // Ensure we notify the UI whenever a track is added or updated
      this.onTrackCallback(this.remoteStream);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE Connection State:", this.pc.iceConnectionState);
      if (this.pc.iceConnectionState === 'failed') {
        this.pc.restartIce();
      }
    };
  }

  private async processCandidateQueue() {
    while (this.candidateQueue.length > 0) {
      const candidate = this.candidateQueue.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("[WebRTC] Error adding buffered ICE candidate:", e);
        }
      }
    }
  }

  async createOffer() {
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.pc.setLocalDescription(offer);
      return offer;
    } catch (e) {
      console.error("[WebRTC] Create Offer Error:", e);
      throw e;
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.processCandidateQueue();
      return answer;
    } catch (e) {
      console.error("[WebRTC] Handle Offer Error:", e);
      throw e;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      if (this.pc.signalingState !== 'stable') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.processCandidateQueue();
      }
    } catch (e) {
      console.error("[WebRTC] Handle Answer Error:", e);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (!this.pc.remoteDescription) {
        this.candidateQueue.push(candidate);
      } else {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.debug("[WebRTC] ICE Candidate add skipped:", e);
    }
  }

  addTracks(stream: MediaStream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      const senders = this.pc.getSenders();
      const existingSender = senders.find(s => s.track?.kind === track.kind);
      if (!existingSender) {
        this.pc.addTrack(track, stream);
      } else if (existingSender.track !== track) {
        existingSender.replaceTrack(track);
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
