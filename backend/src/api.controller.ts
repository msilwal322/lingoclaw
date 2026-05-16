import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiService } from './api.service';

@Controller()
export class ApiController {
  constructor(private api: ApiService) {}

  @Get() root() { return this.api.root(); }
  @Get('health') health() { return this.api.health(); }
  @Get('languages') languages() { return this.api.languages(); }
  @Get('me') me() { return this.api.profile(); }
  @Patch('me') updateMe(@Body() body: any) { return this.api.updateProfile(body); }
  @Get('me/progress') progress() { return this.api.progress(); }
  @Get('lessons') lessons(@Query('lang') lang?: string) { return this.api.lessons(lang); }
  @Get('lessons/:id') lesson(@Param('id') id: string) { return this.api.lesson(id); }
  @Post('lessons/:id/complete') completeLesson(@Param('id') id: string, @Body() body: any) { return this.api.completeLesson(id, Number(body?.score ?? 0)); }
  @Get('stories') stories(@Query('lang') lang?: string) { return this.api.stories(lang); }
  @Post('stories/generate') generateStory(@Body() body: any) { return this.api.generateStory(body ?? {}); }
  @Post('stories/:id/complete') completeStory(@Param('id') id: string) { return this.api.completeStory(id); }
  @Get('achievements') achievements() { return this.api.achievements(); }
  @Get('leaderboard') leaderboard() { return this.api.leaderboard(); }

  // ── Provider CRUD ─────────────────────────────────────────────────────────
  // Static routes first to avoid collision with providers/:id
  @Get('providers') listProviders() { return this.api.listProviders(); }
  @Post('providers') createProvider(@Body() body: any) { return this.api.createProvider(body); }
  @Put('providers') bulkSaveProviders(@Body() body: any) {
    return this.api.bulkSaveProviders(Array.isArray(body) ? body : (body.providers ?? []));
  }

  // ── Role routing (static — must precede providers/:id) ────────────────────
  @Get('providers/roles') listRoles() { return this.api.listRoles(); }
  @Put('providers/roles') saveRoles(@Body() body: any) {
    return this.api.saveRoles(Array.isArray(body) ? body : (body.roles ?? []));
  }

  // ── Parametric provider routes ────────────────────────────────────────────
  @Put('providers/:id') updateProvider(@Param('id') id: string, @Body() body: any) { return this.api.updateProvider(id, body); }
  @Delete('providers/:id') deleteProvider(@Param('id') id: string) { return this.api.deleteProvider(id); }

  // ── Model CRUD ────────────────────────────────────────────────────────────
  @Post('providers/:id/models') addModel(@Param('id') pId: string, @Body() body: any) { return this.api.addModel(pId, body); }
  @Put('providers/:id/models/:modelId') updateModel(@Param('id') pId: string, @Param('modelId') mId: string, @Body() body: any) { return this.api.updateModelCaps(pId, mId, body); }
  @Delete('providers/:id/models/:modelId') deleteModel(@Param('id') pId: string, @Param('modelId') mId: string) { return this.api.deleteModel(pId, mId); }

  // ── Chat ──────────────────────────────────────────────────────────────────
  @Post('chat/sessions') createChatSession() { return this.api.createChatSession(); }
  @Post('chat/sessions/:id/messages') chat(@Param('id') id: string, @Body() body: any) { return this.api.chat(id, String(body?.content ?? '')); }

  // ── Voice ─────────────────────────────────────────────────────────────────
  @Post('voice/sessions') createVoiceSession() { return this.api.createVoiceSession(); }
  @Post('voice/sessions/:id/turns') voiceTurn(@Param('id') id: string, @Body() body: any) { return this.api.voiceTurn(id, String(body?.transcript ?? '')); }
  @Post('voice/sessions/:id/transcribe') transcribeVoice(@Param('id') id: string, @Body() body: any) { return this.api.transcribeAudio(id, String(body?.audio ?? ''), String(body?.mimeType ?? 'audio/webm')); }
  @Post('voice/realtime/session') realtimeSession(@Body() body: any) { return this.api.realtimeSession(body?.sessionId ?? null); }

  // ── Practice ──────────────────────────────────────────────────────────────
  @Get('practice') practice(@Query('lang') lang?: string) { return this.api.practice(lang); }
}
