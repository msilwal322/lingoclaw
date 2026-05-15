import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { StoreService } from './store/store.service';
import { LlmService } from './llm.service';
import { ProvidersStore, makeModelId } from './providers/providers.store';
import { ModelCapability, Provider, ProviderModel, Role, RoleInput } from './providers/types';

@Injectable()
export class ApiService {
  constructor(
    private store: StoreService,
    private llm: LlmService,
    private providers: ProvidersStore,
  ) {}

  private today() { return new Date().toISOString().split('T')[0]; }

  // ── Provider/model helpers ─────────────────────────────────────────────────

  private resolveRoleWithProvider(roleId: string): { role: Role; provider: Provider; model: ProviderModel | null } | null {
    const role = this.providers.getRole(roleId);
    if (!role || !role.enabled || !role.providerId) return null;
    const provider = this.providers.getProvider(role.providerId);
    if (!provider) return null;
    const model = role.modelId ? (this.providers.getModel(role.modelId) ?? null) : null;
    return { role, provider, model };
  }

  private storyRole(): Role | null {
    return this.providers.getRole('story-gen') ?? this.providers.getRole('tutor-chat') ?? null;
  }

  private storyProvider(): Provider | null {
    const role = this.storyRole();
    if (!role || !role.providerId) return null;
    return this.providers.getProvider(role.providerId) ?? null;
  }

  private resolveVoiceRole(): { role: Role; provider: Provider; model: ProviderModel | null; source: string } | null {
    const vt = this.resolveRoleWithProvider('voice-talk');
    if (vt) return { ...vt, source: 'voice-talk' };
    const tc = this.resolveRoleWithProvider('tutor-chat');
    if (tc) return { ...tc, source: 'tutor-chat' };
    return null;
  }

  private isModelUnavailableReply(text: string) {
    return text.startsWith('I could not reach the language model right now.')
      || text.startsWith('I could not reach the language model.');
  }

  private estimateReadTime(wordCount: number) { return Math.max(1, Math.round(wordCount / 180)); }
  private buildStoryId() { return `s_${Date.now()}`; }

  private extractJsonObject(text: string) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced?.[1] ?? text;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return candidate.slice(start, end + 1);
  }

  private parseGeneratedStory(text: string, language: any, requestedLevel?: string) {
    const raw = this.extractJsonObject(text);
    if (!raw) throw new BadGatewayException('Story generator returned invalid JSON');
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      throw new BadGatewayException('Story generator returned malformed JSON');
    }
    const content = String(parsed.content ?? '').trim();
    if (!content) throw new BadGatewayException('Story generator returned empty content');
    const wordsCount = Number(parsed.wordsCount) || content.split(/\s+/).filter(Boolean).length;
    return {
      id: this.buildStoryId(),
      lang: language.code,
      title: String(parsed.title ?? `${language.name} Story`).trim() || `${language.name} Story`,
      language: language.name,
      flag: language.flag,
      level: (parsed.level ?? requestedLevel ?? language.level ?? 'A1') as string,
      genre: String(parsed.genre ?? 'Slice of Life').trim() || 'Slice of Life',
      excerpt: String(parsed.excerpt ?? content.slice(0, 140)).trim() || content.slice(0, 140),
      content,
      readTime: Number(parsed.readTime) || this.estimateReadTime(wordsCount),
      wordsCount,
      completed: false,
    };
  }

  // ── Core endpoints ─────────────────────────────────────────────────────────

  health() { return { ok: true, service: 'lingoclaw-backend', time: new Date().toISOString() }; }
  root() {
    return {
      name: 'lingoclaw-backend', status: 'ok', time: new Date().toISOString(),
      endpoints: ['/health','/languages','/me','/me/progress','/lessons','/lessons/:id','/stories','/stories/generate',
        '/achievements','/leaderboard','/providers','/providers/:id','/providers/:id/models',
        '/providers/:id/models/:modelId','/providers/roles','/chat/sessions','/voice/sessions',
        '/voice/sessions/:id/turns','/voice/realtime/session','/practice'],
    };
  }
  languages() { return this.store.db.languages; }
  profile() { return this.store.db.profile; }
  updateProfile(patch: any) { this.store.db.profile = { ...this.store.db.profile, ...patch }; this.store.save(); return this.profile(); }
  lessons(lang?: string) {
    const p = this.profile();
    const all = this.store.db.lessons.map((l: any) => ({ ...l, completed: p.completedLessons.includes(l.id) }));
    return lang ? all.filter((l: any) => l.lang === lang) : all;
  }
  lesson(id: string) {
    const lesson = this.lessons().find((l: any) => l.id === id);
    if (!lesson) throw new NotFoundException('Lesson not found');
    return { ...lesson, questions: this.store.db.questions };
  }
  completeLesson(id: string, score = 0) {
    const lesson = this.lesson(id);
    const p = this.profile();
    if (!p.completedLessons.includes(id)) p.completedLessons.push(id);
    p.totalXp += lesson.xpReward;
    p.todayXp = (p.lastActiveDate === this.today() ? p.todayXp : 0) + lesson.xpReward;
    p.lastActiveDate = this.today();
    this.store.save();
    return { profile: p, lesson: { ...lesson, completed: true }, score, xpEarned: lesson.xpReward };
  }
  progress() {
    const p = this.profile();
    return { totalXp: p.totalXp, todayXp: p.todayXp, streak: p.streak, longestStreak: p.longestStreak, completedLessons: p.completedLessons, completedStories: p.completedStories, dailyGoalXp: p.dailyGoalXp };
  }
  stories(lang?: string) {
    const p = this.profile();
    const all = this.store.db.stories.map((s: any) => ({ ...s, completed: p.completedStories.includes(s.id) }));
    return lang ? all.filter((s: any) => s.lang === lang) : all;
  }
  async generateStory(body: any = {}) {
    const languageCode = String(body.languageCode ?? this.profile().currentLanguage ?? 'es');
    const requestedLevel = body.level ? String(body.level) : undefined;
    const language = this.store.db.languages.find((l: any) => l.code === languageCode);
    if (!language) throw new NotFoundException('Language not found');
    const role = this.storyRole();
    const provider = this.storyProvider();
    if (!role || !provider || !role.enabled) {
      throw new ServiceUnavailableException('Story generation is not configured. Enable a model role/provider first.');
    }
    const prompt = [
      { role: 'system', content: 'You generate short graded reading stories for language learners. Return ONLY valid JSON with keys: title, level, genre, excerpt, content, wordsCount, readTime. content should be 3-6 short paragraphs in the target language. excerpt should be one sentence teaser in the target language. Keep the story safe, practical, and learner-friendly.' },
      { role: 'user', content: `Generate one ${requestedLevel ?? language.level ?? 'A1'} ${language.name} reading story for a learner. Use the target language for title, excerpt, and content. Prefer slice-of-life or everyday situations. Aim for 120-220 words. Return JSON only.` },
    ];
    const response = await this.llm.chat(provider, role, prompt);
    const story = this.parseGeneratedStory(response, language, requestedLevel);
    this.store.db.stories.unshift(story);
    this.store.save();
    return story;
  }
  completeStory(id: string) {
    const p = this.profile();
    if (!this.store.db.stories.some((s: any) => s.id === id)) throw new NotFoundException('Story not found');
    if (!p.completedStories.includes(id)) p.completedStories.push(id);
    this.store.save();
    return { profile: p, storyId: id };
  }
  achievements() { return this.store.db.achievements; }
  leaderboard() {
    const p = this.profile();
    return [{ rank: 1, name: p.name, avatar: p.avatar, xp: p.totalXp, streak: p.streak, country: 'Local', isCurrentUser: true }];
  }

  // ── Provider / model / role management ────────────────────────────────────

  listProviders() { return this.providers.getProviders(); }

  createProvider(body: any) {
    const id = String(body.id ?? `provider_${Date.now()}`).replace(/\s+/g, '-').toLowerCase();
    return this.providers.upsertProvider({
      id,
      name: String(body.name ?? id),
      compatibilityFamily: body.compatibilityFamily ?? 'openai-compatible',
      baseUrl: String(body.baseUrl ?? ''),
      apiKeyRef: body.apiKeyRef ?? null,
      apiVersion: body.apiVersion ?? null,
      status: body.status ?? 'needs-key',
      notes: String(body.notes ?? ''),
    });
  }

  updateProvider(id: string, body: any) {
    const existing = this.providers.getProvider(id);
    if (!existing) throw new NotFoundException('Provider not found');
    return this.providers.upsertProvider({
      id,
      name: body.name ?? existing.name,
      compatibilityFamily: body.compatibilityFamily ?? existing.compatibilityFamily,
      baseUrl: body.baseUrl ?? existing.baseUrl,
      apiKeyRef: body.apiKeyRef !== undefined ? (body.apiKeyRef || null) : existing.apiKeyRef,
      apiVersion: body.apiVersion !== undefined ? (body.apiVersion || null) : existing.apiVersion,
      status: body.status ?? existing.status,
      notes: body.notes ?? existing.notes,
    });
  }

  deleteProvider(id: string) {
    if (!this.providers.getProvider(id)) throw new NotFoundException('Provider not found');
    this.providers.deleteProvider(id);
    return { deleted: id };
  }

  // Bulk-replace providers (backward compat with old PUT /providers)
  bulkSaveProviders(body: any[]) {
    for (const p of body) {
      const family = p.compatibilityFamily ?? (p.id === 'anthropic' ? 'anthropic-compatible' : 'openai-compatible');
      this.providers.upsertProvider({
        id: p.id,
        name: p.name,
        compatibilityFamily: family,
        baseUrl: p.baseUrl ?? '',
        apiKeyRef: p.apiKeyRef ?? null,
        apiVersion: p.apiVersion ?? null,
        status: p.status ?? 'needs-key',
        notes: p.notes ?? '',
      });
      // Sync models if provided as strings (legacy) or model objects
      if (Array.isArray(p.models)) {
        for (const m of p.models) {
          if (typeof m === 'string') {
            const mid = makeModelId(p.id, m);
            if (!this.providers.getModel(mid)) {
              this.providers.addModel({ id: mid, providerId: p.id, name: m, capabilities: ['chat'] });
            }
          } else if (m && typeof m === 'object') {
            const mid = m.id ?? makeModelId(p.id, m.name);
            this.providers.addModel({ id: mid, providerId: p.id, name: m.name, capabilities: m.capabilities ?? ['chat'] });
          }
        }
      }
    }
    return this.providers.getProviders();
  }

  // ── Model endpoints ───────────────────────────────────────────────────────

  addModel(providerId: string, body: any) {
    if (!this.providers.getProvider(providerId)) throw new NotFoundException('Provider not found');
    const name = String(body.name ?? '').trim();
    if (!name) throw new BadGatewayException('model name is required');
    const caps: ModelCapability[] = Array.isArray(body.capabilities) ? body.capabilities : ['chat'];
    const id = makeModelId(providerId, name);
    return this.providers.addModel({ id, providerId, name, capabilities: caps });
  }

  updateModelCaps(providerId: string, modelId: string, body: any) {
    const model = this.providers.getModel(modelId);
    if (!model || model.providerId !== providerId) throw new NotFoundException('Model not found');
    const caps: ModelCapability[] = Array.isArray(body.capabilities) ? body.capabilities : model.capabilities;
    return this.providers.updateModelCapabilities(modelId, caps) ?? model;
  }

  deleteModel(providerId: string, modelId: string) {
    const model = this.providers.getModel(modelId);
    if (!model || model.providerId !== providerId) throw new NotFoundException('Model not found');
    const unassignedRoles = this.providers.deleteModel(modelId);
    return { deleted: modelId, unassignedRoles };
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  listRoles() { return this.providers.getRoles(); }

  saveRoles(inputs: RoleInput[]) { return this.providers.saveRoles(inputs); }

  // ── Chat ─────────────────────────────────────────────────────────────────

  createChatSession() {
    const session = { id: `cs_${Date.now()}`, createdAt: new Date().toISOString(), languageCode: this.profile().currentLanguage };
    this.store.db.chatSessions.push(session);
    this.store.save();
    return session;
  }

  async chat(sessionId: string, content: string) {
    if (!this.store.db.chatSessions.some((s: any) => s.id === sessionId))
      throw new NotFoundException('Chat session not found');

    const history: Array<{ role: string; content: string }> = this.store.db.chatMessages
      .filter((m: any) => m.sessionId === sessionId)
      .map((m: any) => ({ role: m.role, content: m.content }));

    const user = { id: `m_${Date.now()}_u`, sessionId, role: 'user', content, createdAt: new Date().toISOString() };
    this.store.db.chatMessages.push(user);

    const resolved = this.resolveRoleWithProvider('tutor-chat');
    let replyContent: string;
    if (!resolved) {
      replyContent = 'The tutor is not configured. Please set up a provider and enable the tutor-chat role in settings.';
    } else {
      const { role, provider } = resolved;
      const session = this.store.db.chatSessions.find((s: any) => s.id === sessionId);
      const langCode = session?.languageCode ?? this.profile().currentLanguage ?? 'es';
      const langName = this.store.db.languages.find((l: any) => l.code === langCode)?.name ?? langCode;
      const messages = [
        { role: 'system', content: `You are a friendly ${langName} language tutor. Use the Socratic method: ask guiding questions, give brief grammar explanations, and encourage the student. The student is learning ${langName}. Keep responses concise (2–4 sentences). If the student writes in ${langName}, respond with corrections inline.` },
        ...history,
        { role: 'user', content },
      ];
      replyContent = await this.llm.chat(provider, role, messages);
    }

    const assistant = { id: `m_${Date.now() + 1}_a`, sessionId, role: 'assistant', content: replyContent, createdAt: new Date().toISOString() };
    this.store.db.chatMessages.push(assistant);
    this.store.save();
    return { message: assistant, messages: [user, assistant] };
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  createVoiceSession() {
    const session = { id: `vs_${Date.now()}`, createdAt: new Date().toISOString(), languageCode: this.profile().currentLanguage };
    if (!this.store.db.voiceSessions) this.store.db.voiceSessions = [];
    this.store.db.voiceSessions.push(session);
    this.store.save();
    return session;
  }

  async voiceTurn(sessionId: string, transcript: string) {
    if (!this.store.db.voiceSessions) this.store.db.voiceSessions = [];
    if (!this.store.db.voiceSessions.some((s: any) => s.id === sessionId))
      throw new NotFoundException('Voice session not found');
    if (!this.store.db.voiceMessages) this.store.db.voiceMessages = [];

    const history: Array<{ role: string; content: string }> = this.store.db.voiceMessages
      .filter((m: any) => m.sessionId === sessionId)
      .map((m: any) => ({ role: m.role, content: m.content }));

    const user = { id: `vm_${Date.now()}_u`, sessionId, role: 'user', content: transcript, createdAt: new Date().toISOString() };
    this.store.db.voiceMessages.push(user);

    const voiceSession = this.store.db.voiceSessions.find((s: any) => s.id === sessionId);
    const langCode = voiceSession?.languageCode ?? this.profile().currentLanguage ?? 'es';
    const langName = this.store.db.languages.find((l: any) => l.code === langCode)?.name ?? langCode;

    let replyContent: string;
    let usedFallback = false;

    const resolved = this.resolveVoiceRole();
    if (!resolved) {
      replyContent = 'Voice chat is not configured. Please enable voice-talk or tutor-chat in settings.';
    } else {
      const messages = [
        { role: 'system', content: `You are a conversational ${langName} language practice partner. Engage in brief, natural dialogue with the learner. Keep responses short (1-3 sentences) for spoken conversation. Gently correct major mistakes inline and encourage the learner. Speak naturally as if in a real conversation. The learner is practicing ${langName}.` },
        ...history,
        { role: 'user', content: transcript },
      ];

      try {
        replyContent = await this.llm.chat(resolved.provider, resolved.role, messages);
        const voiceTalkPrimary = resolved.source === 'voice-talk';

        if (resolved.source === 'voice-talk' && this.isModelUnavailableReply(replyContent)) {
          const tc = this.resolveRoleWithProvider('tutor-chat');
          if (tc) {
            const tutorReply = await this.llm.chat(tc.provider, tc.role, messages);
            if (!this.isModelUnavailableReply(tutorReply)) { replyContent = tutorReply; usedFallback = true; }
          }
        } else if (resolved.source === 'tutor-chat' && voiceTalkPrimary) {
          usedFallback = true;
        }
      } catch (err) {
        if (resolved.source === 'voice-talk') {
          const tc = this.resolveRoleWithProvider('tutor-chat');
          if (tc) {
            try { replyContent = await this.llm.chat(tc.provider, tc.role, messages); usedFallback = true; }
            catch { replyContent = 'I could not reach the language model. Please check your provider configuration.'; }
          } else {
            replyContent = 'Voice chat provider is unavailable. Please check your configuration.';
          }
        } else {
          replyContent = 'I could not reach the language model. Please check your provider configuration.';
        }
      }

      if (usedFallback && replyContent! && !replyContent!.startsWith('I could not') && !replyContent!.startsWith('Voice chat')) {
        replyContent = `[Using text model] ${replyContent}`;
      }
    }

    const assistant = { id: `vm_${Date.now() + 1}_a`, sessionId, role: 'assistant', content: replyContent!, createdAt: new Date().toISOString() };
    this.store.db.voiceMessages.push(assistant);
    this.store.save();
    return { userMessage: user, assistantMessage: assistant, transcript, reply: replyContent! };
  }

  async realtimeSession() {
    const resolved = this.resolveVoiceRole();
    if (!resolved) {
      throw new ServiceUnavailableException('Voice chat is not configured. Please enable voice-talk or tutor-chat in settings.');
    }
    const { role, provider, model } = resolved;

    // Realtime capability comes from model metadata, not model name string
    const isRealtimeCapable = model?.capabilities.includes('realtime') ?? false;
    if (!isRealtimeCapable) {
      throw new BadGatewayException('The configured voice-talk model is not realtime-capable. Assign a model with the "realtime" capability in the providers settings.');
    }

    const voiceSession = this.store.db.voiceSessions?.[this.store.db.voiceSessions.length - 1];
    const langCode = voiceSession?.languageCode ?? this.profile().currentLanguage ?? 'es';
    const langName = this.store.db.languages.find((l: any) => l.code === langCode)?.name ?? langCode;
    const instructions = `You are a conversational ${langName} language practice partner. Engage in brief, natural dialogue with the learner. Keep responses short (1-3 sentences) for spoken conversation. Gently correct major mistakes inline and encourage the learner. Speak naturally as if in a real conversation. The learner is practicing ${langName}.`;

    const realtime = await this.llm.createRealtimeSession(provider, role, {
      instructions,
      voice: 'alloy',
      inputAudioTranscriptionModel: 'whisper-1',
      turnDetection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 700, create_response: true, interrupt_response: true },
    });

    return {
      transport: 'webrtc',
      connectUrl: realtime.connectUrl,
      ephemeralKey: realtime.ephemeralKey,
      realtimeApiMode: realtime.authMode === 'api-key' ? 'azure-ga' : 'openai',
      model: role.model,
      temperature: role.temperature ?? 0.7,
      languageCode: langCode,
      languageName: langName,
      instructions,
      voice: 'alloy',
    };
  }

  practice(lang?: string) {
    const languageCode = lang ?? this.profile().currentLanguage ?? 'es';
    const content = this.store.db.practiceContent?.[languageCode];
    if (!content) return { flashcards: [], fillBlanks: [] };
    return { flashcards: content.flashcards ?? [], fillBlanks: content.fillBlanks ?? [] };
  }
}
