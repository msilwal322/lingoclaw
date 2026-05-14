import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { StoreService } from './store/store.service';
import { LlmService } from './llm.service';

@Injectable()
export class ApiService {
  constructor(private store: StoreService, private llm: LlmService) {}

  private today(){ return new Date().toISOString().split('T')[0]; }

  private storyRole() {
    return this.store.db.roles.find((r:any) => r.id === 'story-gen')
      ?? this.store.db.roles.find((r:any) => r.id === 'tutor-chat');
  }

  private storyProvider() {
    const role = this.storyRole();
    return role ? this.store.db.providers.find((p:any) => p.id === role.providerId) : null;
  }

  private resolveVoiceRole() {
    const voiceTalk = this.store.db.roles.find((r: any) => r.id === 'voice-talk');
    const tutorChat = this.store.db.roles.find((r: any) => r.id === 'tutor-chat');
    
    if (voiceTalk && voiceTalk.enabled) {
      const provider = this.store.db.providers.find((p: any) => p.id === voiceTalk.providerId);
      if (provider) {
        return { role: voiceTalk, provider, source: 'voice-talk' };
      }
    }
    
    if (tutorChat && tutorChat.enabled) {
      const provider = this.store.db.providers.find((p: any) => p.id === tutorChat.providerId);
      if (provider) {
        return { role: tutorChat, provider, source: 'tutor-chat' };
      }
    }
    
    return null;
  }

  private isModelUnavailableReply(text: string) {
    return text.startsWith('I could not reach the language model right now.')
      || text.startsWith('I could not reach the language model.');
  }

  private estimateReadTime(wordCount: number) {
    return Math.max(1, Math.round(wordCount / 180));
  }

  private buildStoryId() {
    return `s_${Date.now()}`;
  }

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
    try {
      parsed = JSON.parse(raw);
    } catch {
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

  health(){ return { ok:true, service:'lingoclaw-backend', time:new Date().toISOString() }; }
  root(){ return { name:'lingoclaw-backend', status:'ok', time:new Date().toISOString(), endpoints:['/health','/languages','/me','/me/progress','/lessons','/lessons/:id','/stories','/stories/generate','/achievements','/leaderboard','/providers','/providers/roles','/chat/sessions','/voice/sessions','/voice/sessions/:id/turns','/voice/realtime/session','/practice'] }; }
  languages(){ return this.store.db.languages; }
  profile(){ return this.store.db.profile; }
  updateProfile(patch:any){ this.store.db.profile={...this.store.db.profile,...patch}; this.store.save(); return this.profile(); }
  lessons(lang?: string){ const p=this.profile(); const all=this.store.db.lessons.map((l:any)=>({...l,completed:p.completedLessons.includes(l.id)})); return lang ? all.filter((l:any)=>l.lang===lang) : all; }
  lesson(id:string){ const lesson=this.lessons().find((l:any)=>l.id===id); if(!lesson) throw new NotFoundException('Lesson not found'); return {...lesson,questions:this.store.db.questions}; }
  completeLesson(id:string, score=0){ const lesson=this.lesson(id); const p=this.profile(); if(!p.completedLessons.includes(id)) p.completedLessons.push(id); p.totalXp += lesson.xpReward; p.todayXp = (p.lastActiveDate===this.today()?p.todayXp:0)+lesson.xpReward; p.lastActiveDate=this.today(); this.store.save(); return {profile:p,lesson:{...lesson,completed:true},score,xpEarned:lesson.xpReward}; }
  progress(){ const p=this.profile(); return {totalXp:p.totalXp,todayXp:p.todayXp,streak:p.streak,longestStreak:p.longestStreak,completedLessons:p.completedLessons,completedStories:p.completedStories,dailyGoalXp:p.dailyGoalXp}; }
  stories(lang?: string){ const p=this.profile(); const all=this.store.db.stories.map((s:any)=>({...s,completed:p.completedStories.includes(s.id)})); return lang ? all.filter((s:any)=>s.lang===lang) : all; }
  async generateStory(body:any = {}) {
    const languageCode = String(body.languageCode ?? this.profile().currentLanguage ?? 'es');
    const requestedLevel = body.level ? String(body.level) : undefined;
    const language = this.store.db.languages.find((l:any) => l.code === languageCode);
    if (!language) throw new NotFoundException('Language not found');

    const role = this.storyRole();
    const provider = this.storyProvider();
    if (!role || !provider || !role.enabled) {
      throw new ServiceUnavailableException('Story generation is not configured. Enable a model role/provider first.');
    }

    const prompt = [
      {
        role: 'system',
        content: 'You generate short graded reading stories for language learners. Return ONLY valid JSON with keys: title, level, genre, excerpt, content, wordsCount, readTime. content should be 3-6 short paragraphs in the target language. excerpt should be one sentence teaser in the target language. Keep the story safe, practical, and learner-friendly.',
      },
      {
        role: 'user',
        content: `Generate one ${requestedLevel ?? language.level ?? 'A1'} ${language.name} reading story for a learner. Use the target language for title, excerpt, and content. Prefer slice-of-life or everyday situations. Aim for 120-220 words. Return JSON only.`
      },
    ];

    const response = await this.llm.chat(provider, role, prompt);
    const story = this.parseGeneratedStory(response, language, requestedLevel);
    this.store.db.stories.unshift(story);
    this.store.save();
    return story;
  }
  completeStory(id:string){ const p=this.profile(); if(!this.store.db.stories.some((s:any)=>s.id===id)) throw new NotFoundException('Story not found'); if(!p.completedStories.includes(id)) p.completedStories.push(id); this.store.save(); return {profile:p,storyId:id}; }
  achievements(){ return this.store.db.achievements; }
  leaderboard(){ const p=this.profile(); return [{rank:1,name:p.name,avatar:p.avatar,xp:p.totalXp,streak:p.streak,country:'Local',isCurrentUser:true}]; }
  providers(){ return this.store.db.providers; }
  saveProviders(providers:any[]){ this.store.db.providers=providers.map(p=>({...p,apiKey:undefined})); this.store.save(); return this.providers(); }
  roles(){ return this.store.db.roles; }
  saveRoles(roles:any[]){ this.store.db.roles=roles; this.store.save(); return this.roles(); }
  createChatSession(){ const session={id:`cs_${Date.now()}`,createdAt:new Date().toISOString(),languageCode:this.profile().currentLanguage}; this.store.db.chatSessions.push(session); this.store.save(); return session; }
  async chat(sessionId: string, content: string) {
    if (!this.store.db.chatSessions.some((s: any) => s.id === sessionId))
      throw new NotFoundException('Chat session not found');

    const history: Array<{ role: string; content: string }> = this.store.db.chatMessages
      .filter((m: any) => m.sessionId === sessionId)
      .map((m: any) => ({ role: m.role, content: m.content }));

    const user = { id: `m_${Date.now()}_u`, sessionId, role: 'user', content, createdAt: new Date().toISOString() };
    this.store.db.chatMessages.push(user);

    const tutorRole = this.store.db.roles.find((r: any) => r.id === 'tutor-chat');
    const provider = tutorRole ? this.store.db.providers.find((p: any) => p.id === tutorRole.providerId) : null;

    let replyContent: string;
    if (!tutorRole || !provider || !tutorRole.enabled) {
      replyContent = 'The tutor is not configured. Please set up a provider and enable the tutor-chat role in settings.';
    } else {
      const session = this.store.db.chatSessions.find((s: any) => s.id === sessionId);
      const langCode = session?.languageCode ?? this.profile().currentLanguage ?? 'es';
      const langName = this.store.db.languages.find((l: any) => l.code === langCode)?.name ?? langCode;

      const messages = [
        {
          role: 'system',
          content: `You are a friendly ${langName} language tutor. Use the Socratic method: ask guiding questions, give brief grammar explanations, and encourage the student. The student is learning ${langName}. Keep responses concise (2–4 sentences). If the student writes in ${langName}, respond with corrections inline.`,
        },
        ...history,
        { role: 'user', content },
      ];

      replyContent = await this.llm.chat(provider, tutorRole, messages);
    }

    const assistant = { id: `m_${Date.now() + 1}_a`, sessionId, role: 'assistant', content: replyContent, createdAt: new Date().toISOString() };
    this.store.db.chatMessages.push(assistant);
    this.store.save();

    return { message: assistant, messages: [user, assistant] };
  }

  createVoiceSession() {
    const session = {
      id: `vs_${Date.now()}`,
      createdAt: new Date().toISOString(),
      languageCode: this.profile().currentLanguage,
    };
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

    const user = { 
      id: `vm_${Date.now()}_u`, 
      sessionId, 
      role: 'user', 
      content: transcript, 
      createdAt: new Date().toISOString() 
    };
    this.store.db.voiceMessages.push(user);

    const session = this.store.db.voiceSessions.find((s: any) => s.id === sessionId);
    const langCode = session?.languageCode ?? this.profile().currentLanguage ?? 'es';
    const langName = this.store.db.languages.find((l: any) => l.code === langCode)?.name ?? langCode;

    let replyContent: string;
    let usedFallback = false;

    const resolved = this.resolveVoiceRole();
    if (!resolved) {
      replyContent = 'Voice chat is not configured. Please enable voice-talk or tutor-chat in settings.';
    } else {
      const voiceTalkRole = this.store.db.roles.find((r: any) => r.id === 'voice-talk');
      const isVoiceTalkPrimary = voiceTalkRole?.enabled && resolved.source === 'voice-talk';
      
      const messages = [
        {
          role: 'system',
          content: `You are a conversational ${langName} language practice partner. Engage in brief, natural dialogue with the learner. Keep responses short (1-3 sentences) for spoken conversation. Gently correct major mistakes inline and encourage the learner. Speak naturally as if in a real conversation. The learner is practicing ${langName}.`,
        },
        ...history,
        { role: 'user', content: transcript },
      ];

      try {
        replyContent = await this.llm.chat(resolved.provider, resolved.role, messages);
        
        if (resolved.source === 'tutor-chat' && isVoiceTalkPrimary) {
          usedFallback = true;
        }

        if (resolved.source === 'voice-talk' && this.isModelUnavailableReply(replyContent)) {
          const tutorFallback = this.store.db.roles.find((r: any) => r.id === 'tutor-chat' && r.enabled);
          const tutorProvider = tutorFallback ? this.store.db.providers.find((p: any) => p.id === tutorFallback.providerId) : null;
          if (tutorFallback && tutorProvider) {
            const tutorReply = await this.llm.chat(tutorProvider, tutorFallback, messages);
            if (!this.isModelUnavailableReply(tutorReply)) {
              replyContent = tutorReply;
              usedFallback = true;
            }
          }
        }
      } catch (err) {
        if (resolved.source === 'voice-talk') {
          const tutorFallback = this.store.db.roles.find((r: any) => r.id === 'tutor-chat' && r.enabled);
          const tutorProvider = tutorFallback ? this.store.db.providers.find((p: any) => p.id === tutorFallback.providerId) : null;
          
          if (tutorFallback && tutorProvider) {
            try {
              replyContent = await this.llm.chat(tutorProvider, tutorFallback, messages);
              usedFallback = true;
            } catch {
              replyContent = 'I could not reach the language model. Please check your provider configuration.';
            }
          } else {
            replyContent = 'Voice chat provider is unavailable. Please check your configuration.';
          }
        } else {
          replyContent = 'I could not reach the language model. Please check your provider configuration.';
        }
      }

      if (usedFallback && replyContent && !replyContent.startsWith('I could not') && !replyContent.startsWith('Voice chat')) {
        replyContent = `[Using text model] ${replyContent}`;
      }
    }

    const assistant = { 
      id: `vm_${Date.now() + 1}_a`, 
      sessionId, 
      role: 'assistant', 
      content: replyContent, 
      createdAt: new Date().toISOString() 
    };
    this.store.db.voiceMessages.push(assistant);
    this.store.save();

    return { 
      userMessage: user,
      assistantMessage: assistant,
      transcript: transcript,
      reply: replyContent
    };
  }

  async realtimeSession() {
    const resolved = this.resolveVoiceRole();
    if (!resolved) {
      throw new ServiceUnavailableException('Voice chat is not configured. Please enable voice-talk or tutor-chat in settings.');
    }

    const { role, provider } = resolved;

    const isRealtimeCapable = role.model?.toLowerCase().includes('realtime');
    if (!isRealtimeCapable) {
      throw new BadGatewayException('The configured voice-talk model is not realtime-capable. Please configure a realtime model like gpt-realtime-mini or gpt-4o-realtime-preview.');
    }

    const session = this.store.db.voiceSessions?.[this.store.db.voiceSessions.length - 1];
    const langCode = session?.languageCode ?? this.profile().currentLanguage ?? 'es';
    const langName = this.store.db.languages.find((l: any) => l.code === langCode)?.name ?? langCode;
    const instructions = `You are a conversational ${langName} language practice partner. Engage in brief, natural dialogue with the learner. Keep responses short (1-3 sentences) for spoken conversation. Gently correct major mistakes inline and encourage the learner. Speak naturally as if in a real conversation. The learner is practicing ${langName}.`;

    const realtime = await this.llm.createRealtimeSession(provider, role, {
      instructions,
      voice: 'alloy',
      inputAudioTranscriptionModel: 'whisper-1',
      turnDetection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 700 },
    });

    return {
      transport: 'webrtc',
      connectUrl: realtime.connectUrl,
      ephemeralKey: realtime.ephemeralKey,
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
    
    if (!content) {
      return { flashcards: [], fillBlanks: [] };
    }
    
    return {
      flashcards: content.flashcards ?? [],
      fillBlanks: content.fillBlanks ?? []
    };
  }
}
