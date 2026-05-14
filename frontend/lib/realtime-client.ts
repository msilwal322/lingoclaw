export type RealtimeEvent =
  | { type: 'connected' }
  | { type: 'disconnected'; reason?: string }
  | { type: 'error'; error: string }
  | { type: 'session.created'; session: unknown }
  | { type: 'conversation.item.created'; item: unknown }
  | { type: 'conversation.item.input_audio_transcription.completed'; itemId: string; transcript: string }
  | { type: 'response.audio_transcript.delta'; delta: string; itemId?: string }
  | { type: 'response.audio_transcript.done'; transcript: string; itemId?: string }
  | { type: 'response.text.delta'; delta: string; itemId?: string }
  | { type: 'response.text.done'; text: string; itemId?: string }
  | { type: 'response.done'; response: unknown }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'input_audio_buffer.speech_stopped' };

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export interface RealtimeConfig {
  connectUrl: string;
  ephemeralKey: string;
  model: string;
  temperature?: number;
  instructions?: string;
  voice?: string;
  inputAudioTranscription?: { model?: string };
  turnDetection?: { type: 'server_vad'; threshold?: number; silence_duration_ms?: number } | null;
}

export class RealtimeClient {
  private config: RealtimeConfig;
  private listeners: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private isConnected = false;

  constructor(config: RealtimeConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.peerConnection) {
      throw new Error('Already connected');
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    const peerConnection = new RTCPeerConnection();
    this.peerConnection = peerConnection;

    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    this.remoteAudio.setAttribute('playsinline', 'true');

    peerConnection.ontrack = (event) => {
      if (this.remoteAudio && event.streams[0]) {
        this.remoteAudio.srcObject = event.streams[0];
        void this.remoteAudio.play().catch((err) => {
          this.emit({ type: 'error', error: `Audio playback failed: ${err.message || 'autoplay blocked or playback error'}` });
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      if (this.peerConnection.connectionState === 'connected') {
        this.isConnected = true;
        this.emit({ type: 'connected' });
      }
      if (['failed', 'closed', 'disconnected'].includes(this.peerConnection.connectionState)) {
        const reason = this.peerConnection.connectionState;
        this.isConnected = false;
        this.emit({ type: 'disconnected', reason });
      }
    };

    for (const track of this.localStream.getTracks()) {
      peerConnection.addTrack(track, this.localStream);
    }

    const dataChannel = peerConnection.createDataChannel('oai-events');
    this.dataChannel = dataChannel;
    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch (err) {
        console.error('Failed to parse realtime event', err);
      }
    };
    dataChannel.onerror = () => {
      this.emit({ type: 'error', error: 'Realtime data channel error' });
    };
    dataChannel.onopen = () => {
      this.send({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.config.instructions || '',
          voice: this.config.voice || 'alloy',
          input_audio_transcription: this.config.inputAudioTranscription || { model: 'whisper-1' },
          turn_detection: this.config.turnDetection === undefined
            ? { type: 'server_vad', threshold: 0.5, silence_duration_ms: 700 }
            : this.config.turnDetection,
          temperature: this.config.temperature ?? 0.7,
        },
      });
    };

    const offer = await peerConnection.createOffer({ offerToReceiveAudio: true });
    await peerConnection.setLocalDescription(offer);

    const response = await fetch(this.config.connectUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.ephemeralKey}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!response.ok) {
      const message = `Realtime connect failed: ${response.status} ${await response.text()}`;
      this.cleanup();
      throw new Error(message);
    }

    const answerSdp = await response.text();
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  disconnect(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.cleanup();
  }

  async startAudioStreaming(): Promise<void> {
    if (!this.localStream) {
      throw new Error('Microphone not initialized');
    }
    const tracks = this.localStream.getAudioTracks();
    const isAlreadyStreaming = tracks.some((track) => track.enabled);
    if (!isAlreadyStreaming) {
      tracks.forEach((track) => {
        track.enabled = true;
      });
    }

    if (this.remoteAudio && this.remoteAudio.paused) {
      try {
        await this.remoteAudio.play();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'autoplay blocked or playback error';
        this.emit({ type: 'error', error: `Audio playback failed: ${message}` });
        throw new Error(`Audio playback failed: ${message}`);
      }
    }
  }

  stopAudioStreaming(): void {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }

  sendText(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.send({ type: 'response.create' });
  }

  on(eventType: string, handler: (event: RealtimeEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: (event: RealtimeEvent) => void): void {
    this.listeners.get(eventType)?.delete(handler);
  }

  get connected(): boolean {
    return this.isConnected;
  }

  private send(data: unknown): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }
    this.dataChannel.send(JSON.stringify(data));
  }

  private handleServerEvent(data: unknown): void {
    if (!isJsonObject(data)) {
      console.log('Unhandled realtime event', undefined, data);
      return;
    }

    const eventType = getString(data.type);
    switch (data?.type) {
      case 'session.created':
        this.emit({ type: 'session.created', session: data.session ?? data });
        break;
      case 'conversation.item.created':
        this.emit({ type: 'conversation.item.created', item: data.item });
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.emit({
          type: 'conversation.item.input_audio_transcription.completed',
          itemId: data.item_id,
          transcript: data.transcript ?? '',
        });
        break;
      case 'response.audio_transcript.delta':
        this.emit({ type: 'response.audio_transcript.delta', delta: getString(data.delta), itemId: getString(data.item_id) || undefined });
        break;
      case 'response.audio_transcript.done':
        this.emit({ type: 'response.audio_transcript.done', transcript: getString(data.transcript), itemId: getString(data.item_id) || undefined });
        break;
      case 'response.text.delta':
      case 'response.output_text.delta':
        this.emit({ type: 'response.text.delta', delta: getString(data.delta), itemId: getString(data.item_id) || undefined });
        break;
      case 'response.text.done':
      case 'response.output_text.done':
        this.emit({ type: 'response.text.done', text: getString(data.text), itemId: getString(data.item_id) || undefined });
        break;
      case 'response.done':
        this.emit({ type: 'response.done', response: data.response ?? data });
        break;
      case 'input_audio_buffer.speech_started':
        this.emit({ type: 'input_audio_buffer.speech_started' });
        break;
      case 'input_audio_buffer.speech_stopped':
        this.emit({ type: 'input_audio_buffer.speech_stopped' });
        break;
      case 'error':
        this.emit({
          type: 'error',
          error: isJsonObject(data.error) ? getString(data.error.message, 'Unknown realtime error') : 'Unknown realtime error',
        });
        break;
      default:
        console.log('Unhandled realtime event', eventType, data);
    }
  }

  private emit(event: RealtimeEvent): void {
    this.listeners.get(event.type)?.forEach((handler) => handler(event));
    this.listeners.get('*')?.forEach((handler) => handler(event));
  }

  private cleanup(): void {
    this.isConnected = false;
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }
  }
}
