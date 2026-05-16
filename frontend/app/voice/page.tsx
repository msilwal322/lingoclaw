"use client";

import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import type { ProviderConfig, ModelRole } from "@/lib/providers";
import { RealtimeClient } from "@/lib/realtime-client";
import type { RealtimeEvent } from "@/lib/realtime-client";
import { AlertCircle, CheckCircle2, Mic, Radio, Volume2, Waves, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type RoleStatus = {
  exists: boolean;
  enabled: boolean;
  provider?: string;
  model?: string;
  providerBaseUrl?: string;
  isRealtimeCapable?: boolean;
  supportsRealtimeTransport?: boolean;
};

type ConversationTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type BrowserWindowWithSpeech = Window & typeof globalThis & {
  SpeechRecognition?: BrowserSpeechRecognitionCtor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
};

const LANG_TO_BCP47: Record<string, string> = {
  es: 'es-ES', ja: 'ja-JP', fr: 'fr-FR', de: 'de-DE',
  zh: 'zh-CN', pt: 'pt-BR', ko: 'ko-KR', it: 'it-IT',
  ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', nl: 'nl-NL',
};

type VoiceMode = 'transcript' | 'realtime';
type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type RealtimeResponsePayload = Extract<RealtimeEvent, { type: 'response.done' }>['response'];
type RealtimeTextContent = { type: 'text'; text: string };
type RealtimeOutputItem = {
  id?: string;
  role?: string;
  content?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRealtimeOutputItem(value: unknown): value is RealtimeOutputItem {
  return isRecord(value);
}

function isRealtimeTextContent(value: unknown): value is RealtimeTextContent {
  return isRecord(value) && value.type === 'text' && typeof value.text === 'string';
}

const StatusIcon = ({ status }: { status: RoleStatus }) => {
  if (!status.exists) return <XCircle size={16} className="text-[#ff453a]" />;
  if (!status.enabled) return <AlertCircle size={16} className="text-[#ff9f0a]" />;
  return <CheckCircle2 size={16} className="text-[#30d158]" />;
};

const StatusLabel = ({ status }: { status: RoleStatus }) => {
  if (!status.exists) return <span className="text-[#ff453a]">not configured</span>;
  if (!status.enabled) return <span className="text-[#ff9f0a]">disabled</span>;
  return <span className="text-[#30d158]">ready</span>;
};

export default function VoicePage() {
  const [sttStatus, setSttStatus] = useState<RoleStatus>({ exists: false, enabled: false });
  const [voiceTalkStatus, setVoiceTalkStatus] = useState<RoleStatus>({ exists: false, enabled: false });
  const [ttsStatus, setTtsStatus] = useState<RoleStatus>({ exists: false, enabled: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>("Spanish");
  const [currentLanguageCode, setCurrentLanguageCode] = useState<string>("es");
  const [languageOptions, setLanguageOptions] = useState<Array<{code: string, name: string}>>([]);
  
  // Voice mode
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('transcript');
  
  // Transcript mode state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
  const [hasMicSupport, setHasMicSupport] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Realtime mode state
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>('disconnected');
  const [realtimeConversation, setRealtimeConversation] = useState<ConversationTurn[]>([]);
  const [isRealtimeStreaming, setIsRealtimeStreaming] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [currentRealtimeTranscript, setCurrentRealtimeTranscript] = useState('');
  const [currentRealtimeResponse, setCurrentRealtimeResponse] = useState('');
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const currentRealtimeResponseRef = useRef('');
  const finalizedRealtimeResponseIdsRef = useRef<Set<string>>(new Set());

  const syncRealtimeResponse = useCallback((value: string | ((prev: string) => string)) => {
    setCurrentRealtimeResponse((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      currentRealtimeResponseRef.current = next;
      return next;
    });
  }, []);

  const finalizeRealtimeResponse = useCallback((response: RealtimeResponsePayload) => {
    const responseRecord = isRecord(response) ? response : null;
    const responseId = String(responseRecord?.id ?? '');
    if (responseId && finalizedRealtimeResponseIdsRef.current.has(responseId)) {
      syncRealtimeResponse('');
      return;
    }

    const streamedText = currentRealtimeResponseRef.current.trim();
    let finalText = streamedText;
    let finalItemId = responseId || `rt_assistant_${Date.now()}`;

    if (!finalText) {
      const outputItems = Array.isArray(responseRecord?.output) ? responseRecord.output : [];
      for (const item of outputItems) {
        if (!isRealtimeOutputItem(item) || item.role !== 'assistant' || !Array.isArray(item.content)) continue;
        const textContent = item.content.find(isRealtimeTextContent);
        if (textContent) {
          finalText = textContent.text.trim();
          finalItemId = String(item.id ?? finalItemId);
          break;
        }
      }
    }

    syncRealtimeResponse('');

    if (!finalText) return;
    if (responseId) finalizedRealtimeResponseIdsRef.current.add(responseId);

    setRealtimeConversation((prev) => [
      ...prev,
      {
        id: finalItemId,
        role: 'assistant',
        content: finalText,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [syncRealtimeResponse]);

  const handleTranscriptSubmit = useCallback(async (transcript: string) => {
    if (!sessionId || !transcript.trim() || isSending) return;
    
    setIsSending(true);
    setTranscriptError(null);
    setManualTranscript("");
    
    try {
      const result = await api.sendVoiceTurn(sessionId, transcript.trim());
      
      setConversation(prev => [
        ...prev,
        {
          id: result.userMessage.id,
          role: "user",
          content: result.userMessage.content,
          createdAt: result.userMessage.createdAt,
        },
        {
          id: result.assistantMessage.id,
          role: "assistant",
          content: result.assistantMessage.content,
          createdAt: result.assistantMessage.createdAt,
        },
      ]);
    } catch (err) {
      console.error("Failed to send voice turn:", err);
      setTranscriptError(err instanceof Error ? err.message : "Failed to send transcript.");
    } finally {
      setIsSending(false);
    }
  }, [sessionId, isSending]);

  const blobToBase64 = useCallback((blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read recorded audio.'));
        return;
      }
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  }), []);

  const stopTranscriptMediaStream = useCallback(() => {
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopTranscriptRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      return;
    }
    setIsRecording(false);
    stopTranscriptMediaStream();
  }, [stopTranscriptMediaStream]);

  const startTranscriptRecording = useCallback(async () => {
    if (!sessionId || isSending || isTranscribing) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setTranscriptError('Transcript mode requires microphone recording support in this browser.');
      return;
    }

    setTranscriptError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeTypeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = mimeTypeCandidates.find((candidate) => {
        try {
          return typeof MediaRecorder.isTypeSupported === 'function' ? MediaRecorder.isTypeSupported(candidate) : candidate === 'audio/webm';
        } catch {
          return false;
        }
      });
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('Transcript recorder error:', event);
        setTranscriptError('Recording failed. Please try again or type your message manually.');
        setIsRecording(false);
        setIsTranscribing(false);
        stopTranscriptMediaStream();
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const chunks = [...mediaChunksRef.current];
        const recordedMimeType = recorder.mimeType || mimeType || 'audio/webm';
        stopTranscriptMediaStream();

        if (chunks.length === 0) {
          setTranscriptError('No audio was captured. Please try again.');
          return;
        }

        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(chunks, { type: recordedMimeType });
          const base64Audio = await blobToBase64(audioBlob);
          const result = await api.transcribeVoice(sessionId, base64Audio, recordedMimeType);
          if (!result.transcript.trim()) {
            throw new Error('Speech-to-text returned an empty transcript.');
          }
          await handleTranscriptSubmit(result.transcript);
        } catch (err) {
          console.error('Failed to transcribe recorded audio:', err);
          setTranscriptError(err instanceof Error ? err.message : 'Failed to transcribe audio.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start transcript recording:', err);
      setTranscriptError(err instanceof Error ? err.message : 'Could not access the microphone.');
      setIsRecording(false);
      stopTranscriptMediaStream();
    }
  }, [blobToBase64, handleTranscriptSubmit, isSending, isTranscribing, sessionId, stopTranscriptMediaStream]);

  useEffect(() => {
    // Check for mic and speech API support
    if (typeof window !== "undefined") {
      setHasMicSupport(
        typeof navigator !== "undefined"
          && !!navigator.mediaDevices?.getUserMedia
          && typeof MediaRecorder !== 'undefined'
      );

      const speechWindow = window as BrowserWindowWithSpeech;
      const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      setHasSpeechRecognition(!!SpeechRecognition);

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = LANG_TO_BCP47[currentLanguageCode] ?? `${currentLanguageCode}-${currentLanguageCode.toUpperCase()}`;

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setIsRecording(false);
          handleTranscriptSubmit(transcript);
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setTranscriptError('Browser speech recognition failed. Try typing your message manually.');
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    // Load language options from backend
    api.languages()
      .then((langs) => {
        setLanguageOptions(langs);
      })
      .catch(() => {
        setLanguageOptions([]);
      });
    
    // Load current language
    api.me()
      .then((profile) => {
        api.languages().then((langs) => {
          const lang = langs.find((l) => l.code === profile.currentLanguage);
          if (lang) { setCurrentLanguage(lang.name); setCurrentLanguageCode(lang.code); }
        }).catch(() => {});
      })
      .catch(() => {});

    // Load provider and role status
    Promise.all([api.providers(), api.roles()])
      .then(([providers, roles]) => {
        const stt = roles.find((r: ModelRole) => r.id === "stt");
        const brain = roles.find((r: ModelRole) => r.id === "voice-talk");
        const tts = roles.find((r: ModelRole) => r.id === "tts");
        
        const getProvider = (id?: string | null) => id ? providers.find((p: ProviderConfig) => p.id === id) : undefined;
        const getProviderName = (id?: string | null) => getProvider(id)?.name ?? "not configured";
        const supportsRealtimeTransport = (provider?: ProviderConfig) => {
          if (!provider) return false;
          try {
            const url = new URL(provider.baseUrl);
            const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
            return !localHosts.has(url.hostname);
          } catch {
            return false;
          }
        };
        
        const brainProvider = brain ? getProvider(brain.providerId ?? undefined) : undefined;
        const brainModel = brain?.modelId
          ? brainProvider?.models.find((m) => m.id === brain.modelId)
          : undefined;

        setSttStatus({
          exists: !!stt,
          enabled: stt?.enabled ?? false,
          provider: stt ? getProviderName(stt.providerId ?? undefined) : undefined,
          model: stt?.model ?? undefined,
        });

        setVoiceTalkStatus({
          exists: !!brain,
          enabled: brain?.enabled ?? false,
          provider: brain ? getProviderName(brain.providerId ?? undefined) : undefined,
          providerBaseUrl: brainProvider?.baseUrl,
          model: brain?.model ?? undefined,
          isRealtimeCapable: brainModel?.capabilities.includes("realtime") ?? false,
          supportsRealtimeTransport: supportsRealtimeTransport(brainProvider),
        });

        setTtsStatus({
          exists: !!tts,
          enabled: tts?.enabled ?? false,
          provider: tts ? getProviderName(tts.providerId ?? undefined) : undefined,
          model: tts?.model ?? undefined,
        });

        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load configuration");
        setLoading(false);
      });
  }, [handleTranscriptSubmit, currentLanguageCode]);

  // Realtime mode functions
  const connectRealtime = async () => {
    setRealtimeState('connecting');
    setRealtimeError(null);
    finalizedRealtimeResponseIdsRef.current.clear();
    syncRealtimeResponse('');
    setCurrentRealtimeTranscript('');
    
    try {
      // Detect insecure origins (must come before getUserMedia check)
      if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:';
        const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        
        if (!isSecure && !isLocalhost) {
          throw new Error(
            `Realtime voice requires HTTPS or localhost. Mobile browsers block microphone and WebRTC APIs on insecure origins like ${window.location.protocol}//${window.location.host}. ` +
            'Please access this app via https:// or http://localhost to use realtime voice features.'
          );
        }
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Realtime voice requires browser microphone support. Try a modern browser with microphone access enabled.');
      }

      // Preflight microphone access check
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach(track => track.stop());
      } catch (micErr: unknown) {
        const micErrorName = isRecord(micErr) && typeof micErr.name === 'string' ? micErr.name : '';
        throw new Error(`Microphone access denied or unavailable. ${micErrorName === 'NotAllowedError' ? 'Please grant microphone permissions and try again.' : 'Check your device settings.'}`);
      }

      const config = await api.createRealtimeSession();

      const client = new RealtimeClient({
        connectUrl: config.connectUrl,
        ephemeralKey: config.ephemeralKey,
        realtimeApiMode: config.realtimeApiMode,
        model: config.model,
        temperature: config.temperature,
        instructions: config.instructions,
        voice: config.voice,
        inputAudioTranscription: { model: 'whisper-1' },
        turnDetection: {
          type: 'server_vad',
          threshold: 0.5,
          silence_duration_ms: 700,
          create_response: true,
          interrupt_response: true,
        },
      });

      // Set up event listeners
      client.on('connected', () => {
        console.log('Realtime session connected');
        setRealtimeState('connected');
      });

      client.on('disconnected', (event: Extract<RealtimeEvent, { type: 'disconnected' }>) => {
        console.log('Realtime session disconnected:', event.reason);
        setRealtimeState('disconnected');
        setIsRealtimeStreaming(false);
      });

      client.on('error', (event: Extract<RealtimeEvent, { type: 'error' }>) => {
        console.error('Realtime error:', event.error);
        setRealtimeError(event.error);
        if (realtimeClientRef.current === client) {
          setRealtimeState('error');
          setIsRealtimeStreaming(false);
        }
      });

      client.on('session.created', (event: Extract<RealtimeEvent, { type: 'session.created' }>) => {
        console.log('Session created:', event.session);
      });

      client.on('input_audio_buffer.speech_started', () => {
        console.log('User started speaking');
        setCurrentRealtimeTranscript('listening...');
      });

      client.on('input_audio_buffer.speech_stopped', () => {
        console.log('User stopped speaking');
      });

      client.on('conversation.item.created', (event: Extract<RealtimeEvent, { type: 'conversation.item.created' }>) => {
        console.log('Conversation item created:', event.item);
      });

      client.on('conversation.item.input_audio_transcription.completed', (event: Extract<RealtimeEvent, { type: 'conversation.item.input_audio_transcription.completed' }>) => {
        const userText = String(event.transcript || '').trim();
        if (!userText) return;
        setCurrentRealtimeTranscript('');
        setRealtimeConversation(prev => [
          ...prev,
          {
            id: event.itemId || `rt_user_${Date.now()}`,
            role: 'user',
            content: userText,
            createdAt: new Date().toISOString(),
          }
        ]);
      });

      client.on('response.text.delta', (event: Extract<RealtimeEvent, { type: 'response.text.delta' }>) => {
        syncRealtimeResponse(prev => prev + (event.delta ?? ''));
      });

      client.on('response.text.done', (event: Extract<RealtimeEvent, { type: 'response.text.done' }>) => {
        if (!event.text || currentRealtimeResponseRef.current.trim()) return;
        syncRealtimeResponse(String(event.text));
      });

      // Audio transcript events (Azure GA: response.output_audio_transcript.*, OpenAI: response.audio_transcript.*)
      // Both are mapped to these normalized events in realtime-client.ts
      client.on('response.audio_transcript.delta', (event: Extract<RealtimeEvent, { type: 'response.audio_transcript.delta' }>) => {
        syncRealtimeResponse(prev => prev + (event.delta ?? ''));
      });

      client.on('response.audio_transcript.done', (event: Extract<RealtimeEvent, { type: 'response.audio_transcript.done' }>) => {
        if (!event.transcript || currentRealtimeResponseRef.current.trim()) return;
        syncRealtimeResponse(String(event.transcript));
      });

      client.on('response.done', (event: Extract<RealtimeEvent, { type: 'response.done' }>) => {
        console.log('Response done:', event.response, 'dataChannel:', client.dataChannelState);
        finalizeRealtimeResponse(event.response);
      });

      // Connect to the WebSocket with timeout
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const connectPromise = client.connect();
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          client.disconnect();
          reject(new Error('Connection timeout after 15 seconds. Check your network and try again.'));
        }, 15000);
      });

      try {
        await Promise.race([connectPromise, timeoutPromise]);
      } finally {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      }
      realtimeClientRef.current = client;
      
    } catch (err) {
      console.error('Failed to connect to realtime session:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setRealtimeError(errorMsg);
      setRealtimeState('error');
      setIsRealtimeStreaming(false);
      syncRealtimeResponse('');
      
      // Cleanup on connection failure
      if (realtimeClientRef.current) {
        realtimeClientRef.current.disconnect();
        realtimeClientRef.current = null;
      }
    }
  };

  const disconnectRealtime = () => {
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    setRealtimeState('disconnected');
    setIsRealtimeStreaming(false);
    syncRealtimeResponse('');
    setCurrentRealtimeTranscript('');
  };

  const toggleRealtimeStreaming = async () => {
    if (!realtimeClientRef.current || realtimeState !== 'connected') return;

    if (isRealtimeStreaming) {
      realtimeClientRef.current.stopAudioStreaming();
      setIsRealtimeStreaming(false);
    } else {
      try {
        await realtimeClientRef.current.startAudioStreaming();
        setIsRealtimeStreaming(true);
      } catch (err) {
        console.error('Failed to start audio streaming:', err);
        setRealtimeError(err instanceof Error ? err.message : 'Failed to access microphone');
      }
    }
  };

  const resetRealtimeSession = () => {
    disconnectRealtime();
    setRealtimeConversation([]);
    setRealtimeError(null);
    setCurrentRealtimeTranscript('');
    setCurrentRealtimeResponse('');
  };

  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    stopTranscriptRecording();
    if (realtimeClientRef.current) realtimeClientRef.current.disconnect();
  }, [stopTranscriptRecording]);

  // Transcript mode functions
  const startSession = async () => {
    try {
      const session = await api.createVoiceSession();
      setSessionId(session.id);
      setConversation([]);
      setManualTranscript("");
      setTranscriptError(null);
    } catch (err) {
      console.error("Failed to start session:", err);
      setTranscriptError(err instanceof Error ? err.message : 'Failed to start transcript session.');
    }
  };

  const resetSession = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    stopTranscriptRecording();
    setSessionId(null);
    setConversation([]);
    setManualTranscript("");
    setTranscriptError(null);
  };

  const toggleRecording = () => {
    const canUseBackendStt = sttStatus.exists && sttStatus.enabled && hasMicSupport;
    if (canUseBackendStt) {
      if (isRecording) {
        stopTranscriptRecording();
      } else {
        void startTranscriptRecording();
      }
      return;
    }

    if (!recognitionRef.current) {
      setTranscriptError('Transcript mode needs either backend STT + microphone support or browser speech recognition.');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setTranscriptError(null);
      setIsRecording(true);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTranscript.trim()) {
      handleTranscriptSubmit(manualTranscript);
    }
  };

  const allRolesReady = sttStatus.exists && sttStatus.enabled && 
                        voiceTalkStatus.exists && voiceTalkStatus.enabled && 
                        ttsStatus.exists && ttsStatus.enabled;

  const canUseRealtime = Boolean(voiceTalkStatus.exists && voiceTalkStatus.enabled && voiceTalkStatus.isRealtimeCapable && voiceTalkStatus.supportsRealtimeTransport);

  return (
    <AppShell>
      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-[#9a9898] mb-2">modules/voice-talk</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Voice talk console</h1>
          <p className="text-[#9a9898] max-w-2xl mb-2">
            Practice language conversation with either transcript turns or a live realtime session.
          </p>
          <p className="text-[#6a6868] text-xs max-w-2xl mb-8">
            Choose between transcript mode (browser speech recognition) or realtime mode (browser mic + WebRTC session bootstrap for OpenAI-compatible realtime endpoints).
          </p>

          {loading ? (
            <div className="border border-white/10 rounded bg-[#161414] p-8 text-center text-[#9a9898]">
              Loading configuration...
            </div>
          ) : error ? (
            <div className="border border-[#ff453a]/30 rounded bg-[#161414] p-8 text-center">
              <p className="text-[#ff453a] mb-2">Error loading configuration</p>
              <p className="text-xs text-[#9a9898]">{error}</p>
              <p className="text-xs text-[#6a6868] mt-4">Start the backend with <code>cd backend && npm run start:dev</code></p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_340px] gap-5">
              <div className="space-y-5">
                {/* Status Overview */}
                <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                    <Waves size={15}/> pipeline status
                  </div>
                  <div className="p-6">
                    {allRolesReady ? (
                      <div className="border border-[#30d158]/30 rounded bg-[#252121] p-4 mb-4">
                        <div className="flex items-center gap-2 text-[#30d158] font-bold mb-2">
                          <CheckCircle2 size={18} />
                          Voice pipeline configured
                        </div>
                        <p className="text-xs text-[#9a9898]">
                          All required roles (stt, voice-talk, tts) are configured and enabled.
                          {canUseRealtime && ' Realtime mode can also be bootstrapped for the configured remote provider.'}
                        </p>
                      </div>
                    ) : (
                      <div className="border border-[#ff9f0a]/30 rounded bg-[#252121] p-4 mb-4">
                        <div className="flex items-center gap-2 text-[#ff9f0a] font-bold mb-2">
                          <AlertCircle size={18} />
                          Voice pipeline incomplete
                        </div>
                        <p className="text-xs text-[#9a9898]">
                          Configure the required roles in <Link href="/providers" className="underline">provider settings</Link> to enable voice features.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* STT Status */}
                      <div className="border border-white/10 rounded bg-[#201d1d] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={sttStatus} />
                            <span className="font-bold text-sm">Speech to Text (stt)</span>
                          </div>
                          <StatusLabel status={sttStatus} />
                        </div>
                        {sttStatus.exists && (
                          <div className="text-xs text-[#9a9898]">
                            <div>Provider: {sttStatus.provider}</div>
                            <div>Model: {sttStatus.model}</div>
                          </div>
                        )}
                        {!sttStatus.exists && (
                          <p className="text-xs text-[#6a6868]">Add an stt role in provider settings</p>
                        )}
                      </div>

                      {/* Voice-Talk Status */}
                      <div className="border border-white/10 rounded bg-[#201d1d] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={voiceTalkStatus} />
                            <span className="font-bold text-sm">Voice Talk Brain (voice-talk)</span>
                          </div>
                          <StatusLabel status={voiceTalkStatus} />
                        </div>
                        {voiceTalkStatus.exists && (
                          <>
                            <div className="text-xs text-[#9a9898] mb-2">
                              <div>Provider: {voiceTalkStatus.provider}</div>
                              <div>Model: {voiceTalkStatus.model}</div>
                            </div>
                            {voiceTalkStatus.isRealtimeCapable && (
                              <div className="text-[10px] text-[#30d158] border border-[#30d158]/30 rounded px-2 py-1 inline-block">
                                ✓ Realtime-capable model detected
                              </div>
                            )}
                            {voiceTalkStatus.isRealtimeCapable && !voiceTalkStatus.supportsRealtimeTransport && (
                              <div className="text-[10px] text-[#ff9f0a] border border-[#ff9f0a]/30 rounded px-2 py-1 inline-block">
                                ⚠ Realtime model selected, but provider looks local/non-bootstrap-capable
                              </div>
                            )}
                            {!voiceTalkStatus.isRealtimeCapable && (
                              <div className="text-[10px] text-[#ff9f0a] border border-[#ff9f0a]/30 rounded px-2 py-1 inline-block">
                                ⚠ Standard model (realtime model recommended)
                              </div>
                            )}
                          </>
                        )}
                        {!voiceTalkStatus.exists && (
                          <p className="text-xs text-[#6a6868]">Add a voice-talk role in provider settings</p>
                        )}
                      </div>

                      {/* TTS Status */}
                      <div className="border border-white/10 rounded bg-[#201d1d] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={ttsStatus} />
                            <span className="font-bold text-sm">Text to Speech (tts)</span>
                          </div>
                          <StatusLabel status={ttsStatus} />
                        </div>
                        {ttsStatus.exists && (
                          <div className="text-xs text-[#9a9898]">
                            <div>Provider: {ttsStatus.provider}</div>
                            <div>Model: {ttsStatus.model}</div>
                          </div>
                        )}
                        {!ttsStatus.exists && (
                          <p className="text-xs text-[#6a6868]">Add a tts role in provider settings</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                    <Radio size={15}/> conversation mode
                  </div>
                  <div className="p-6">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (voiceMode === 'realtime') {
                            disconnectRealtime();
                          }
                          setVoiceMode('transcript');
                        }}
                        className={`flex-1 border rounded px-4 py-3 font-bold text-sm transition-colors ${
                          voiceMode === 'transcript'
                            ? 'border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158]'
                            : 'border-white/10 bg-[#252121] text-[#9a9898] hover:bg-[#201d1d]'
                        }`}
                      >
                        Transcript Mode
                        <div className="text-[10px] font-normal mt-1">
                          Press-to-transcribe (fallback)
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          if (voiceMode === 'transcript') {
                            resetSession();
                          }
                          setVoiceMode('realtime');
                        }}
                        disabled={!canUseRealtime}
                        className={`flex-1 border rounded px-4 py-3 font-bold text-sm transition-colors ${
                          voiceMode === 'realtime'
                            ? 'border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158]'
                            : canUseRealtime
                            ? 'border-white/10 bg-[#252121] text-[#9a9898] hover:bg-[#201d1d]'
                            : 'border-white/10 bg-[#252121] text-[#6a6868] cursor-not-allowed opacity-50'
                        }`}
                      >
                        Realtime Mode
                        <div className="text-[10px] font-normal mt-1">
                          {canUseRealtime ? 'Live mic + speaker session' : 'Requires realtime model + supported remote provider'}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voice Conversation Interface - Transcript Mode */}
                {voiceMode === 'transcript' && (
                  <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio size={15}/> transcript conversation
                      </div>
                      <div className="flex gap-2">
                        {!sessionId ? (
                          <button 
                            onClick={startSession}
                            className="text-xs border border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158] rounded px-3 py-1 hover:bg-[#30d158]/20"
                          >
                            start session
                          </button>
                        ) : (
                          <button 
                            onClick={resetSession}
                            className="text-xs border border-white/20 bg-[#252121] text-[#9a9898] rounded px-3 py-1 hover:bg-[#201d1d]"
                          >
                            reset session
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6 min-h-[320px] flex flex-col justify-between">
                      {!sessionId ? (
                        <div className="text-center text-[#6a6868] py-12">
                          Click &ldquo;start session&rdquo; to begin a voice conversation
                        </div>
                      ) : (
                        <>
                          {/* Conversation Log */}
                          <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                            {conversation.length === 0 ? (
                              <div className="text-xs text-[#6a6868] text-center py-4">
                                Session started. Speak or type to begin conversation.
                              </div>
                            ) : (
                              conversation.map((turn) => (
                                <div 
                                  key={turn.id} 
                                  className={`border border-white/10 rounded p-4 ${
                                    turn.role === "user" ? "bg-[#201d1d]" : "bg-[#252121]"
                                  }`}
                                >
                                  <span className={turn.role === "user" ? "text-[#9a9898]" : "text-[#30d158]"}>
                                    {turn.role === "user" ? "you:" : "tutor:"}
                                  </span>{" "}
                                  {turn.content}
                                </div>
                              ))
                            )}
                          </div>

                          {/* Input Area */}
                          {(sttStatus.exists && sttStatus.enabled && hasMicSupport) || hasSpeechRecognition ? (
                            <div className="space-y-2">
                              {transcriptError && (
                                <div className="border border-[#ff453a]/30 rounded bg-[#252121] px-3 py-2 text-xs text-[#ffb4ab]">
                                  {transcriptError}
                                </div>
                              )}
                              <button 
                                onClick={toggleRecording}
                                disabled={isSending || isTranscribing}
                                className={`w-full border rounded px-5 py-4 font-bold inline-flex items-center justify-center gap-3 transition-colors ${
                                  isRecording 
                                    ? "border-[#ff453a]/30 bg-[#ff453a] text-[#fdfcfc]" 
                                    : isSending || isTranscribing
                                    ? "border-white/10 bg-[#252121] text-[#6a6868] cursor-not-allowed"
                                    : "border-white/15 bg-[#fdfcfc] text-[#201d1d] hover:bg-[#e0dfdf]"
                                }`}
                              >
                                <Mic size={18}/>
                                {isRecording
                                  ? (sttStatus.exists && sttStatus.enabled && hasMicSupport ? "recording... click to stop" : "listening...")
                                  : isTranscribing
                                  ? "transcribing..."
                                  : isSending
                                  ? "processing..."
                                  : "press to speak"}
                              </button>
                              <div className="text-[10px] text-[#6a6868] text-center">
                                {sttStatus.exists && sttStatus.enabled && hasMicSupport
                                  ? 'Using backend STT for transcript mode.'
                                  : 'Using browser speech recognition.'}
                              </div>
                            </div>
                          ) : (
                            <form onSubmit={handleManualSubmit} className="space-y-2">
                              {transcriptError && (
                                <div className="border border-[#ff453a]/30 rounded bg-[#252121] px-3 py-2 text-xs text-[#ffb4ab]">
                                  {transcriptError}
                                </div>
                              )}
                              <textarea
                                value={manualTranscript}
                                onChange={(e) => setManualTranscript(e.target.value)}
                                placeholder="Type your message here..."
                                disabled={isSending}
                                className="w-full bg-[#201d1d] border border-white/10 rounded px-4 py-3 text-[#fdfcfc] text-sm resize-none min-h-[80px] disabled:opacity-50"
                              />
                              <button 
                                type="submit"
                                disabled={isSending || !manualTranscript.trim()}
                                className="w-full border border-white/15 bg-[#fdfcfc] text-[#201d1d] rounded px-5 py-3 font-bold hover:bg-[#e0dfdf] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSending ? "sending..." : "send message"}
                              </button>
                              <div className="text-[10px] text-[#6a6868] text-center">
                                Microphone transcription is unavailable. Using text input fallback.
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Voice Conversation Interface - Realtime Mode */}
                {voiceMode === 'realtime' && (
                  <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio size={15}/> realtime conversation
                        {realtimeState === 'connected' && (
                          <span className="text-[10px] text-[#30d158] border border-[#30d158]/30 rounded px-2 py-0.5">
                            ● LIVE
                          </span>
                        )}
                        {realtimeState === 'connecting' && (
                          <span className="text-[10px] text-[#ff9f0a] border border-[#ff9f0a]/30 rounded px-2 py-0.5">
                            ○ connecting...
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {realtimeState === 'disconnected' ? (
                          <button 
                            onClick={connectRealtime}
                            className="text-xs border border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158] rounded px-3 py-1 hover:bg-[#30d158]/20"
                          >
                            connect
                          </button>
                        ) : (
                          <button 
                            onClick={resetRealtimeSession}
                            className="text-xs border border-white/20 bg-[#252121] text-[#9a9898] rounded px-3 py-1 hover:bg-[#201d1d]"
                          >
                            disconnect
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6 min-h-[320px] flex flex-col justify-between">
                      {realtimeState === 'disconnected' || realtimeState === 'error' ? (
                        <div className="text-center py-12">
                          {realtimeError ? (
                            <>
                              <div className="border border-[#ff453a]/30 rounded bg-[#252121] p-5 mb-4">
                                <div className="flex items-center justify-center gap-2 text-[#ff453a] font-bold mb-3">
                                  <AlertCircle size={20} />
                                  Realtime Connection Error
                                </div>
                                <div className="text-sm text-[#fdfcfc] leading-relaxed mb-2">{realtimeError}</div>
                              </div>
                              <button 
                                onClick={connectRealtime}
                                className="text-xs border border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158] rounded px-4 py-2 hover:bg-[#30d158]/20 font-bold"
                              >
                                retry connection
                              </button>
                            </>
                          ) : (
                            <div className="text-[#6a6868]">
                              Click &ldquo;connect&rdquo; to start a realtime voice session
                            </div>
                          )}
                        </div>
                      ) : realtimeState === 'connecting' ? (
                        <div className="text-center text-[#9a9898] py-12">
                          Connecting to realtime session...
                        </div>
                      ) : (
                        <>
                          {realtimeError && (
                            <div className="mb-3 border border-[#ff453a]/30 rounded bg-[#252121] p-4">
                              <div className="flex items-center gap-2 text-[#ff453a] font-bold text-sm mb-2">
                                <AlertCircle size={16} />
                                Connection Issue
                              </div>
                              <div className="text-xs text-[#fdfcfc] leading-relaxed">{realtimeError}</div>
                            </div>
                          )}
                          {/* Conversation Log */}
                          <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                            {realtimeConversation.length === 0 && !currentRealtimeTranscript && !currentRealtimeResponse ? (
                              <div className="text-xs text-[#6a6868] text-center py-4">
                                Connected. Click &ldquo;start speaking&rdquo; to begin.
                              </div>
                            ) : (
                              <>
                                {realtimeConversation.map((turn) => (
                                  <div 
                                    key={turn.id} 
                                    className={`border border-white/10 rounded p-4 ${
                                      turn.role === "user" ? "bg-[#201d1d]" : "bg-[#252121]"
                                    }`}
                                  >
                                    <span className={turn.role === "user" ? "text-[#9a9898]" : "text-[#30d158]"}>
                                      {turn.role === "user" ? "you:" : "tutor:"}
                                    </span>{" "}
                                    {turn.content}
                                  </div>
                                ))}
                                {currentRealtimeTranscript && (
                                  <div className="border border-white/10 rounded p-4 bg-[#201d1d] opacity-60">
                                    <span className="text-[#9a9898]">you:</span> {currentRealtimeTranscript}
                                  </div>
                                )}
                                {currentRealtimeResponse && (
                                  <div className="border border-white/10 rounded p-4 bg-[#252121] opacity-60">
                                    <span className="text-[#30d158]">tutor:</span> {currentRealtimeResponse}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Realtime Controls */}
                          <div className="space-y-2">
                            <button 
                              onClick={toggleRealtimeStreaming}
                              className={`w-full border rounded px-5 py-4 font-bold inline-flex items-center justify-center gap-3 transition-colors ${
                                isRealtimeStreaming
                                  ? "border-[#ff453a]/30 bg-[#ff453a] text-[#fdfcfc]" 
                                  : "border-white/15 bg-[#fdfcfc] text-[#201d1d] hover:bg-[#e0dfdf]"
                              }`}
                            >
                              <Mic size={18}/>
                              {isRealtimeStreaming ? "speaking... (click to stop)" : "start speaking"}
                            </button>
                            <div className="text-[10px] text-[#30d158] text-center">
                              ✓ Live WebRTC audio session with backend-issued ephemeral auth
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                {/* Implementation Notes */}
                <div className="border border-white/10 rounded bg-[#252121] p-4">
                  <div className="flex items-center gap-2 font-bold mb-3 text-sm">
                    <CheckCircle2 size={16} className="text-[#30d158]"/> implementation status
                  </div>
                  <div className="text-xs text-[#9a9898] space-y-2 leading-relaxed">
                    <p>Voice conversation features:</p>
                    <ul className="list-disc list-inside space-y-1 text-[#30d158]">
                      <li>Transcript mode (fallback)</li>
                      <li>Transcript fallback mode</li>
                      <li>Realtime session mode (remote realtime providers only)</li>
                      <li>Live audio input/output</li>
                      <li>Browser WebRTC transport</li>
                      <li>Server-side VAD</li>
                    </ul>
                    <p className="pt-2">Configure your voice-talk role with a realtime model in <Link href="/providers" className="underline text-[#fdfcfc]">provider settings</Link>.</p>
                  </div>
                </div>

                {/* Voice Settings */}
                <div className="border border-white/10 rounded bg-[#252121] p-4">
                  <div className="flex items-center gap-2 font-bold mb-3"><Volume2 size={16}/> voice settings</div>
                  <label className="text-xs text-[#9a9898]">target language
                    <select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc]" disabled>
                      {languageOptions.length > 0 ? (
                        languageOptions.map((lang) => (
                          <option key={lang.code} value={lang.code}>{lang.name} / {lang.code}</option>
                        ))
                      ) : (
                        <option>{currentLanguage} (loading...)</option>
                      )}
                    </select>
                  </label>
                  <label className="text-xs text-[#9a9898] block mt-3">correction style
                    <select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc]" disabled>
                      <option>minimal interruption</option>
                      <option>strict pronunciation</option>
                      <option>grammar coach</option>
                    </select>
                  </label>
                  <p className="text-[10px] text-[#6a6868] mt-3">Settings integration coming soon</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
