import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from './store/store.service';
import { LlmService } from './llm.service';
@Injectable()
export class ApiService {
  constructor(private store: StoreService, private llm: LlmService) {}
  private today(){ return new Date().toISOString().split('T')[0]; }
  health(){ return { ok:true, service:'lingoclaw-backend', time:new Date().toISOString() }; }
  root(){ return { name:'lingoclaw-backend', status:'ok', time:new Date().toISOString(), endpoints:['/health','/languages','/me','/me/progress','/lessons','/lessons/:id','/stories','/achievements','/leaderboard','/providers','/providers/roles','/chat/sessions'] }; }
  languages(){ return this.store.db.languages; }
  profile(){ return this.store.db.profile; }
  updateProfile(patch:any){ this.store.db.profile={...this.store.db.profile,...patch}; this.store.save(); return this.profile(); }
  lessons(lang?: string){ const p=this.profile(); const all=this.store.db.lessons.map((l:any)=>({...l,completed:p.completedLessons.includes(l.id)})); return lang ? all.filter((l:any)=>l.lang===lang) : all; }
  lesson(id:string){ const lesson=this.lessons().find((l:any)=>l.id===id); if(!lesson) throw new NotFoundException('Lesson not found'); return {...lesson,questions:this.store.db.questions}; }
  completeLesson(id:string, score=0){ const lesson=this.lesson(id); const p=this.profile(); if(!p.completedLessons.includes(id)) p.completedLessons.push(id); p.totalXp += lesson.xpReward; p.todayXp = (p.lastActiveDate===this.today()?p.todayXp:0)+lesson.xpReward; p.lastActiveDate=this.today(); this.store.save(); return {profile:p,lesson:{...lesson,completed:true},score,xpEarned:lesson.xpReward}; }
  progress(){ const p=this.profile(); return {totalXp:p.totalXp,todayXp:p.todayXp,streak:p.streak,longestStreak:p.longestStreak,completedLessons:p.completedLessons,completedStories:p.completedStories,dailyGoalXp:p.dailyGoalXp}; }
  stories(lang?: string){ const p=this.profile(); const all=this.store.db.stories.map((s:any)=>({...s,completed:p.completedStories.includes(s.id)})); return lang ? all.filter((s:any)=>s.lang===lang) : all; }
  completeStory(id:string){ const p=this.profile(); if(!this.store.db.stories.some((s:any)=>s.id===id)) throw new NotFoundException('Story not found'); if(!p.completedStories.includes(id)) p.completedStories.push(id); this.store.save(); return {profile:p,storyId:id}; }
  achievements(){ return this.store.db.achievements; }
  leaderboard(){ const p=this.profile(); return [{rank:1,name:p.name,avatar:p.avatar,xp:p.totalXp,streak:p.streak,country:'Local',isCurrentUser:true},{rank:2,name:'Demo workspace',avatar:'⌘',xp:12800,streak:8,country:'Seed',isCurrentUser:false}]; }
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
}
