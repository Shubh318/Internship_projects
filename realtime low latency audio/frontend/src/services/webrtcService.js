// Client-side WebRTC Manager

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class WebRTCService {
  constructor({ onIceCandidate, onTrack, onConnectionStateChange }) {
    this.peerConnection = null;
    this.localStream = null;
    this.onIceCandidate = onIceCandidate;
    this.onTrack = onTrack;
    this.onConnectionStateChange = onConnectionStateChange;
    this.remoteDescriptionSet = false;
    this.remoteIceCandidatesQueue = [];
  }

  /**
   * Captures microphone access
   */
  async getLocalAudioStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      return this.localStream;
    } catch (error) {
      console.error('Failed to capture microphone stream:', error);
      throw error;
    }
  }

  /**
   * Initializes RTCPeerConnection
   */
  createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_CONFIG);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      console.log('Added local audio tracks to peer connection.');
    }

    // ICE Candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // Track handler (fired when remote track arrives)
    this.peerConnection.ontrack = (event) => {
      console.log('Remote audio track received from peer.');
      if (this.onTrack && event.streams && event.streams[0]) {
        this.onTrack(event.streams[0]);
      }
    };

    // Connection state change listener
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log(`WebRTC Connection State changed to: ${state}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    return this.peerConnection;
  }

  /**
   * Generates a WebRTC Offer
   */
  async createOffer() {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Processes a WebRTC Offer and generates a WebRTC Answer
   */
  async handleOffer(offer) {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this.remoteDescriptionSet = true;
    await this.flushRemoteIceCandidates();
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Processes a WebRTC Answer from the peer
   */
  async handleAnswer(answer) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      this.remoteDescriptionSet = true;
      await this.flushRemoteIceCandidates();
    }
  }

  /**
   * Flushes remote ICE candidates queue once remote description is set
   */
  async flushRemoteIceCandidates() {
    if (this.remoteIceCandidatesQueue && this.remoteIceCandidatesQueue.length > 0) {
      console.log(`[WebRTC] Flushing ${this.remoteIceCandidatesQueue.length} queued remote ICE candidates.`);
      while (this.remoteIceCandidatesQueue.length > 0) {
        const candidate = this.remoteIceCandidatesQueue.shift();
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding queued remote ICE candidate:', err);
        }
      }
    }
  }

  /**
   * Incorporates external ICE candidates
   */
  async addIceCandidate(candidate) {
    if (!candidate) return;
    if (this.peerConnection && this.remoteDescriptionSet) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    } else {
      console.log('[WebRTC] Queueing remote ICE candidate until remote description is set.');
      this.remoteIceCandidatesQueue.push(candidate);
    }
  }

  /**
   * Mute / Unmute the microphone track locally
   */
  setMute(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      console.log(`Local microphone muted: ${isMuted}`);
    }
  }

  /**
   * Safely terminates connections and media tracks
   */
  close() {
    console.log('Closing WebRTC connection and cleaning streams.');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.remoteDescriptionSet = false;
    this.remoteIceCandidatesQueue = [];
  }
}
