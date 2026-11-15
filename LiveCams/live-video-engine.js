/* LIVE // EARTH — Live Video Engine (OpenEye WHEP)
   Starts only on explicit user action. This engine never settles payments,
   never retries a paid/402 session, and closes the provider session on stop.
   Supported source: OpenEye /v1/streams/:id/whep/offer, feed_kind=live_video.
*/
(() => {
  'use strict';
  if (window.LiveEarthLiveVideoEngine) return;

  const API_BASE = 'https://api.openeye.cam/v1';
  const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

  class LiveVideoError extends Error {
    constructor(message, code = 'video_error', status = 0) {
      super(message);
      this.name = 'LiveVideoError';
      this.code = code;
      this.status = status;
    }
  }

  class OpenEyeWHEPPlayer {
    constructor({ streamId, videoElement, onState = () => {}, onTrack = () => {}, onError = () => {} } = {}) {
      this.streamId = String(streamId || '').trim();
      this.videoElement = videoElement || null;
      this.onState = onState;
      this.onTrack = onTrack;
      this.onError = onError;
      this.peer = null;
      this.sessionUrl = '';
      this.abortController = null;
      this.stopped = false;
      this.started = false;
      this.trackStream = null;
      this.hasVideoTrack = false;
    }

    emit(state, detail) {
      try { this.onState(state, detail); } catch (error) { console.warn('[LIVE // EARTH] Video state callback failed.', error); }
    }

    async waitForIceGathering(timeoutMs = 15000) {
      const peer = this.peer;
      if (!peer) throw new LiveVideoError('The WebRTC connection is unavailable.', 'peer_missing');
      if (peer.iceGatheringState === 'complete') return;
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          peer.removeEventListener('icegatheringstatechange', check);
          this.abortController?.signal.removeEventListener('abort', abort);
          if (error) reject(error); else resolve();
        };
        const check = () => {
          if (peer.iceGatheringState === 'complete') finish();
        };
        const abort = () => finish(new LiveVideoError('The video connection was cancelled.', 'aborted'));
        const timer = setTimeout(() => finish(new LiveVideoError('ICE candidate gathering timed out. The network may be blocking WebRTC.', 'ice_timeout')), timeoutMs);
        peer.addEventListener('icegatheringstatechange', check);
        this.abortController?.signal.addEventListener('abort', abort, { once: true });
        check();
      });
    }

    bindPeerEvents() {
      const peer = this.peer;
      if (!peer) return;
      peer.addEventListener('track', event => {
        if (this.stopped || !this.videoElement) return;
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        this.trackStream = stream;
        if (event.track?.kind === 'video') this.hasVideoTrack = true;
        this.videoElement.srcObject = stream;
        this.videoElement.hidden = false;
        this.onTrack(stream);
        this.emit('track', stream);
        const play = this.videoElement.play?.();
        if (play && typeof play.catch === 'function') {
          play.catch(() => this.emit('autoplay-blocked'));
        }
      });
      peer.addEventListener('connectionstatechange', () => {
        if (this.stopped) return;
        if (peer.connectionState === 'connected') this.emit('connected');
        else if (peer.connectionState === 'disconnected') this.emit('disconnected');
        else if (peer.connectionState === 'failed') {
          const error = new LiveVideoError('The WebRTC connection failed. This stream may be offline or unreachable on this network.', 'connection_failed');
          this.onError(error);
          this.stop();
        }
      });
      peer.addEventListener('iceconnectionstatechange', () => {
        if (this.stopped || peer.connectionState === 'failed') return;
        if (peer.iceConnectionState === 'failed') {
          const error = new LiveVideoError('ICE could not reach the camera stream. Try another network or camera.', 'ice_failed');
          this.onError(error);
          this.stop();
        }
      });
    }

    async waitForVideoTrack(timeoutMs = 20000) {
      if (this.hasVideoTrack) return;
      const peer = this.peer;
      if (!peer) throw new LiveVideoError('The WebRTC connection was lost before video arrived.', 'peer_missing');
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = error => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          peer.removeEventListener('track', check);
          peer.removeEventListener('connectionstatechange', check);
          this.abortController?.signal.removeEventListener('abort', abort);
          if (error) reject(error); else resolve();
        };
        const check = () => {
          if (this.hasVideoTrack) finish();
          else if (peer.connectionState === 'failed') finish(new LiveVideoError('The WebRTC connection failed before a video track arrived.', 'connection_failed'));
        };
        const abort = () => finish(new LiveVideoError('The video connection was cancelled.', 'aborted'));
        const timer = setTimeout(() => finish(new LiveVideoError('The camera accepted the video request but did not send a video track within 20 seconds.', 'video_track_timeout')), timeoutMs);
        peer.addEventListener('track', check);
        peer.addEventListener('connectionstatechange', check);
        this.abortController?.signal.addEventListener('abort', abort, { once: true });
        check();
      });
    }

    async start() {
      if (this.started) return this;
      if (!this.streamId || !/^stream_[A-Za-z0-9_-]+$/.test(this.streamId)) {
        throw new LiveVideoError('This camera does not provide a valid OpenEye stream ID.', 'invalid_stream_id');
      }
      if (!this.videoElement) throw new LiveVideoError('The in-app video element is missing.', 'video_element_missing');
      if (typeof window.RTCPeerConnection !== 'function') {
        throw new LiveVideoError('This browser does not support WebRTC live playback.', 'webrtc_unavailable');
      }

      this.started = true;
      this.abortController = new AbortController();
      this.emit('preparing');
      try {
        this.peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.bindPeerEvents();
        this.peer.addTransceiver('video', { direction: 'recvonly' });
        this.peer.addTransceiver('audio', { direction: 'recvonly' });

        const offer = await this.peer.createOffer();
        if (this.stopped) throw new LiveVideoError('The video session was cancelled.', 'aborted');
        await this.peer.setLocalDescription(offer);
        await this.waitForIceGathering();
        if (this.stopped) throw new LiveVideoError('The video session was cancelled.', 'aborted');

        const endpoint = `${API_BASE}/streams/${encodeURIComponent(this.streamId)}/whep/offer`;
        this.emit('connecting');
        const response = await fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          signal: this.abortController.signal,
          headers: { Accept: 'application/sdp', 'Content-Type': 'application/sdp' },
          body: this.peer.localDescription?.sdp || offer.sdp
        });
        if (this.stopped) throw new LiveVideoError('The video session was cancelled.', 'aborted');

        if (response.status === 402) {
          throw new LiveVideoError('The provider requires payment for this live-video session. No payment was made. Paid streams are not enabled in Live Cams.', 'payment_required', 402);
        }
        if (response.status === 401 || response.status === 403) {
          throw new LiveVideoError('The provider denied live-video access or requires server-side authentication. No API key is stored in this app.', 'authentication_required', response.status);
        }
        if (response.status !== 200 && response.status !== 201) {
          const detail = (await response.text().catch(() => '')).trim().slice(0, 220);
          throw new LiveVideoError(`The live-video service returned HTTP ${response.status}${detail ? `: ${detail}` : '.'}`, 'whep_http_error', response.status);
        }

        const location = response.headers.get('Location');
        if (!location) {
          throw new LiveVideoError(
            'The video service did not expose its WHEP session Location header. The browser cannot safely track and close this session, so playback was stopped. The provider may need to expose Location through CORS.',
            'whep_location_missing'
          );
        }
        const session = new URL(location, endpoint);
        const apiOrigin = new URL(API_BASE).origin;
        if (session.protocol !== 'https:' || session.origin !== apiOrigin) {
          throw new LiveVideoError(
            'The video service returned an unexpected WHEP session URL. The app refused to keep a session it could not safely close.',
            'whep_location_invalid'
          );
        }
        this.sessionUrl = session.href;
        const answer = (await response.text()).trim();
        if (!answer.startsWith('v=') || !answer.includes('m=')) {
          throw new LiveVideoError('The provider did not return a valid SDP answer for this video stream.', 'invalid_sdp_answer');
        }
        if (this.stopped) throw new LiveVideoError('The video session was cancelled.', 'aborted');
        await this.peer.setRemoteDescription({ type: 'answer', sdp: answer });
        this.emit('connecting');
        await this.waitForVideoTrack();
        this.emit('connected');
        return this;
      } catch (error) {
        const normalized = error?.name === 'AbortError'
          ? new LiveVideoError('The video connection was cancelled.', 'aborted')
          : error instanceof LiveVideoError
            ? error
            : new LiveVideoError(error?.message || 'Could not establish the WebRTC video session. Check browser network/CORS support.', 'network_error');
        if (!this.stopped && normalized.code !== 'aborted') {
          try { this.onError(normalized); } catch (_) {}
        }
        await this.stop();
        throw normalized;
      }
    }

    async stop() {
      if (this.stopped) return;
      this.stopped = true;
      this.abortController?.abort();
      const sessionUrl = this.sessionUrl;
      this.sessionUrl = '';
      if (this.videoElement) {
        try { this.videoElement.pause(); } catch (_) {}
        if (this.videoElement.srcObject) {
          for (const track of this.videoElement.srcObject.getTracks?.() || []) {
            try { track.stop(); } catch (_) {}
          }
        }
        this.videoElement.srcObject = null;
      }
      if (this.trackStream) {
        for (const track of this.trackStream.getTracks?.() || []) {
          try { track.stop(); } catch (_) {}
        }
        this.trackStream = null;
      }
      if (this.peer) {
        try { this.peer.close(); } catch (_) {}
        this.peer = null;
      }
      if (sessionUrl) {
        try {
          await fetch(sessionUrl, { method: 'DELETE', mode: 'cors', credentials: 'omit', cache: 'no-store', keepalive: true });
        } catch (error) {
          console.warn('[LIVE // EARTH] Provider session cleanup request could not be completed.', error);
        }
      }
      this.emit('closed');
    }
  }

  window.LiveEarthLiveVideoEngine = OpenEyeWHEPPlayer;
})();
