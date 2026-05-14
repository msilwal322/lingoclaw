"use client";

import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import type { ProviderConfig, ModelRole } from "@/lib/providers";
import { AlertCircle, CheckCircle2, Mic, Radio, Volume2, Waves, XCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type RoleStatus = {
  exists: boolean;
  enabled: boolean;
  provider?: string;
  model?: string;
  isRealtimeCapable?: boolean;
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
  const [languageOptions, setLanguageOptions] = useState<Array<{code: string, name: string}>>([]);
  
  // Voice session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const handleTranscriptSubmit = useCallback(async (transcript: string) => {
    if (!sessionId || !transcript.trim() || isSending) return;
    
    setIsSending(true);
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
    } finally {
      setIsSending(false);
    }
  }, [sessionId, isSending]);

  useEffect(() => {
    // Check for Web Speech API support
    if (typeof window !== "undefined") {
      const speechWindow = window as BrowserWindowWithSpeech;
      const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      setHasSpeechRecognition(!!SpeechRecognition);
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "es-ES"; // Default to Spanish, should be dynamic based on language
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setIsRecording(false);
          handleTranscriptSubmit(transcript);
        };
        
        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
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
          if (lang) setCurrentLanguage(lang.name);
        }).catch(() => {});
      })
      .catch(() => {});

    // Load provider and role status
    Promise.all([api.providers(), api.roles()])
      .then(([providers, roles]) => {
        const stt = roles.find((r: ModelRole) => r.id === "stt");
        const brain = roles.find((r: ModelRole) => r.id === "voice-talk");
        const tts = roles.find((r: ModelRole) => r.id === "tts");
        
        const getProviderName = (id?: string) => 
          providers.find((p: ProviderConfig) => p.id === id)?.name ?? "not configured";
        
        setSttStatus({
          exists: !!stt,
          enabled: stt?.enabled ?? false,
          provider: stt ? getProviderName(stt.providerId) : undefined,
          model: stt?.model
        });

        setVoiceTalkStatus({
          exists: !!brain,
          enabled: brain?.enabled ?? false,
          provider: brain ? getProviderName(brain.providerId) : undefined,
          model: brain?.model,
          isRealtimeCapable: brain?.model?.toLowerCase().includes('realtime') ?? false
        });

        setTtsStatus({
          exists: !!tts,
          enabled: tts?.enabled ?? false,
          provider: tts ? getProviderName(tts.providerId) : undefined,
          model: tts?.model
        });

        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load configuration");
        setLoading(false);
      });
  }, [handleTranscriptSubmit]);

  const startSession = async () => {
    try {
      const session = await api.createVoiceSession();
      setSessionId(session.id);
      setConversation([]);
      setManualTranscript("");
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  const resetSession = () => {
    setSessionId(null);
    setConversation([]);
    setManualTranscript("");
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
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

  return (
    <AppShell>
      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-[#9a9898] mb-2">modules/voice-talk</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Voice talk console</h1>
          <p className="text-[#9a9898] max-w-2xl mb-2">
            Practice language conversation with push-to-transcribe interaction.
          </p>
          <p className="text-[#6a6868] text-xs max-w-2xl mb-8">
            Uses browser speech recognition when available, with text input fallback. Not live streaming – this is transcript-to-response interaction.
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
                          All required roles (stt, voice-talk, tts) are configured and enabled. Note that live audio transport is not yet implemented.
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

                {/* Voice Conversation Interface */}
                <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio size={15}/> voice conversation
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
                        {hasSpeechRecognition ? (
                          <div className="space-y-2">
                            <button 
                              onClick={toggleRecording}
                              disabled={isSending}
                              className={`w-full border rounded px-5 py-4 font-bold inline-flex items-center justify-center gap-3 transition-colors ${
                                isRecording 
                                  ? "border-[#ff453a]/30 bg-[#ff453a] text-[#fdfcfc]" 
                                  : isSending
                                  ? "border-white/10 bg-[#252121] text-[#6a6868] cursor-not-allowed"
                                  : "border-white/15 bg-[#fdfcfc] text-[#201d1d] hover:bg-[#e0dfdf]"
                              }`}
                            >
                              <Mic size={18}/>
                              {isRecording ? "recording... (release to stop)" : isSending ? "processing..." : "press to speak"}
                            </button>
                            <div className="text-[10px] text-[#6a6868] text-center">
                              Using browser speech recognition (local, non-streaming)
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleManualSubmit} className="space-y-2">
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
                              Browser speech recognition not available. Using text input fallback.
                            </div>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                {/* Implementation Notes */}
                <div className="border border-white/10 rounded bg-[#252121] p-4">
                  <div className="flex items-center gap-2 font-bold mb-3 text-sm">
                    <AlertCircle size={16}/> implementation status
                  </div>
                  <div className="text-xs text-[#9a9898] space-y-2 leading-relaxed">
                    <p>Voice conversation pipeline is now functional:</p>
                    <ul className="list-disc list-inside space-y-1 text-[#30d158]">
                      <li>Press-to-transcribe interaction</li>
                      <li>Browser speech recognition (when available)</li>
                      <li>Text fallback for manual input</li>
                      <li>Backend voice-talk role integration</li>
                    </ul>
                    <p className="pt-2 text-[#6a6868]">Not yet implemented:</p>
                    <ul className="list-disc list-inside space-y-1 text-[#6a6868]">
                      <li>WebSocket/realtime streaming</li>
                      <li>Raw audio upload to STT</li>
                      <li>TTS audio playback</li>
                    </ul>
                    <p className="pt-2">Configure roles in <Link href="/providers" className="underline text-[#fdfcfc]">provider settings</Link>.</p>
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
                  <p className="text-[10px] text-[#6a6868] mt-3">Settings disabled until voice features are implemented</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
