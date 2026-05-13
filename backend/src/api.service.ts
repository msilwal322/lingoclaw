import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from './store/store.service';
@Injectable()
export class ApiService {
  constructor(private store: StoreService) {}
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
  chat(sessionId:string, content:string){ if(!this.store.db.chatSessions.some((s:any)=>s.id===sessionId)) throw new NotFoundException('Chat session not found'); const user={id:`m_${Date.now()}_u`,sessionId,role:'user',content,createdAt:new Date().toISOString()}; const reply=`I heard: "${content}". Try answering in ${this.profile().currentLanguage === 'es' ? 'Spanish' : 'your target language'} too. One small correction at a time is the fastest path.`; const assistant={id:`m_${Date.now()}_a`,sessionId,role:'assistant',content:reply,createdAt:new Date().toISOString()}; this.store.db.chatMessages.push(user,assistant); this.store.save(); return {message:assistant,messages:[user,assistant]}; }
}
