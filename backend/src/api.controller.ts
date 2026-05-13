import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiService } from './api.service';
@Controller()
export class ApiController {
  constructor(private api: ApiService) {}
  @Get() root(){ return this.api.root(); }
  @Get('health') health(){ return this.api.health(); }
  @Get('languages') languages(){ return this.api.languages(); }
  @Get('me') me(){ return this.api.profile(); }
  @Patch('me') updateMe(@Body() body:any){ return this.api.updateProfile(body); }
  @Get('me/progress') progress(){ return this.api.progress(); }
  @Get('lessons') lessons(@Query('lang') lang?: string){ return this.api.lessons(lang); }
  @Get('lessons/:id') lesson(@Param('id') id:string){ return this.api.lesson(id); }
  @Post('lessons/:id/complete') completeLesson(@Param('id') id:string,@Body() body:any){ return this.api.completeLesson(id, Number(body?.score ?? 0)); }
  @Get('stories') stories(@Query('lang') lang?: string){ return this.api.stories(lang); }
  @Post('stories/:id/complete') completeStory(@Param('id') id:string){ return this.api.completeStory(id); }
  @Get('achievements') achievements(){ return this.api.achievements(); }
  @Get('leaderboard') leaderboard(){ return this.api.leaderboard(); }
  @Get('providers') providers(){ return this.api.providers(); }
  @Put('providers') saveProviders(@Body() body:any){ return this.api.saveProviders(Array.isArray(body)?body:body.providers); }
  @Get('providers/roles') roles(){ return this.api.roles(); }
  @Put('providers/roles') saveRoles(@Body() body:any){ return this.api.saveRoles(Array.isArray(body)?body:body.roles); }
  @Post('chat/sessions') createChatSession(){ return this.api.createChatSession(); }
  @Post('chat/sessions/:id/messages') chat(@Param('id') id:string,@Body() body:any){ return this.api.chat(id, String(body?.content ?? '')); }
}
