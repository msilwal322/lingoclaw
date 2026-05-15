import { Test } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { LlmService } from './llm.service';
import { StoreModule } from './store/store.module';
import { StoreService } from './store/store.service';

describe('ApiController', () => {
  let c: ApiController;
  let store: StoreService;
  let llm: LlmService;
  
  beforeEach(async () => {
    process.env.DATA_FILE = '/tmp/lingoclaw-test-db.json';
    const m = await Test.createTestingModule({
      imports: [StoreModule],
      controllers: [ApiController],
      providers: [ApiService, LlmService]
    }).compile();
    c = m.get(ApiController);
    store = m.get(StoreService);
    llm = m.get(LlmService);
  });

  it('root returns name and endpoints', () => {
    const r = c.root();
    expect(r.name).toBe('lingoclaw-backend');
    expect(Array.isArray(r.endpoints)).toBe(true);
    expect(r.endpoints.length).toBeGreaterThan(0);
    expect(r.endpoints).toContain('/voice/sessions');
    expect(r.endpoints).toContain('/voice/sessions/:id/turns');
  });

  it('is healthy', () => expect(c.health().ok).toBe(true));

  it('returns seeded lessons', () => expect(c.lessons().length).toBeGreaterThan(0));

  it('creates voice session', () => {
    const s = c.createVoiceSession();
    expect(s.id).toMatch(/^vs_\d+$/);
    expect(s.languageCode).toBeDefined();
    expect(s.createdAt).toBeDefined();
  });

  it('processes voice turn and returns response', async () => {
    const s = c.createVoiceSession();
    const result = await c.voiceTurn(s.id, { transcript: 'hola como estas' });
    expect(result.transcript).toBe('hola como estas');
    expect(result.userMessage.content).toBe('hola como estas');
    expect(result.assistantMessage.content).toBeDefined();
    expect(typeof result.reply).toBe('string');
  }, 10000);

  it('voice turn falls back to tutor-chat when voice-talk is disabled', async () => {
    const s = c.createVoiceSession();
    
    // Disable voice-talk role
    const voiceTalkRole = store.db.roles.find((r: any) => r.id === 'voice-talk');
    if (voiceTalkRole) voiceTalkRole.enabled = false;
    
    const result = await c.voiceTurn(s.id, { transcript: 'bonjour' });
    expect(result.transcript).toBe('bonjour');
    expect(result.assistantMessage.content).toBeDefined();
    expect(typeof result.reply).toBe('string');
    
    // Re-enable for other tests
    if (voiceTalkRole) voiceTalkRole.enabled = true;
  }, 10000);

  it('voice turn returns config message when both roles disabled', async () => {
    const s = c.createVoiceSession();
    
    // Disable both roles
    const voiceTalkRole = store.db.roles.find((r: any) => r.id === 'voice-talk');
    const tutorChatRole = store.db.roles.find((r: any) => r.id === 'tutor-chat');
    const voiceEnabled = voiceTalkRole?.enabled;
    const tutorEnabled = tutorChatRole?.enabled;
    
    if (voiceTalkRole) voiceTalkRole.enabled = false;
    if (tutorChatRole) tutorChatRole.enabled = false;
    
    const result = await c.voiceTurn(s.id, { transcript: 'test' });
    expect(result.reply).toContain('not configured');
    
    // Restore
    if (voiceTalkRole) voiceTalkRole.enabled = voiceEnabled;
    if (tutorChatRole) tutorChatRole.enabled = tutorEnabled;
  }, 10000);

  it('creates realtime bootstrap session for realtime-capable voice model', async () => {
    const voiceTalkRole = store.db.roles.find((r: any) => r.id === 'voice-talk');
    const openAiCompatibleProvider = store.db.providers.find((p: any) => p.id === 'openai-compatible');
    expect(voiceTalkRole).toBeDefined();
    expect(openAiCompatibleProvider).toBeDefined();

    if (voiceTalkRole) {
      voiceTalkRole.enabled = true;
      voiceTalkRole.providerId = 'openai-compatible';
      voiceTalkRole.model = 'gpt-realtime-mini';
    }

    jest.spyOn(llm, 'createRealtimeSession').mockResolvedValue({
      connectUrl: 'https://api.openai.com/v1/realtime?model=gpt-realtime-mini',
      ephemeralKey: 'ephemeral_test_key',
      authMode: 'bearer',
      session: { id: 'sess_123' },
    });

    const result = await c.realtimeSession();
    expect(result.transport).toBe('webrtc');
    expect(result.connectUrl).toContain('/realtime');
    expect(result.ephemeralKey).toBe('ephemeral_test_key');
    expect(result.model).toContain('realtime');
  });

  it('returns practice content for current language', () => {
    const content = c.practice();
    expect(content.flashcards).toBeDefined();
    expect(content.fillBlanks).toBeDefined();
    expect(Array.isArray(content.flashcards)).toBe(true);
    expect(Array.isArray(content.fillBlanks)).toBe(true);
  });

  it('returns practice content for specific language', () => {
    const esContent = c.practice('es');
    expect(esContent.flashcards.length).toBeGreaterThan(0);
    expect(esContent.fillBlanks.length).toBeGreaterThan(0);
    
    const jaContent = c.practice('ja');
    expect(jaContent.flashcards.length).toBeGreaterThan(0);
    expect(jaContent.fillBlanks.length).toBeGreaterThan(0);
    
    const frContent = c.practice('fr');
    expect(frContent.flashcards.length).toBeGreaterThan(0);
    expect(frContent.fillBlanks.length).toBeGreaterThan(0);
    
    const deContent = c.practice('de');
    expect(deContent.flashcards.length).toBeGreaterThan(0);
    expect(deContent.fillBlanks.length).toBeGreaterThan(0);
  });

  it('returns empty arrays for unsupported language', () => {
    const content = c.practice('unsupported');
    expect(content.flashcards).toEqual([]);
    expect(content.fillBlanks).toEqual([]);
  });

  it('practice flashcards have required fields', () => {
    const content = c.practice('es');
    expect(content.flashcards.length).toBeGreaterThan(0);
    const card = content.flashcards[0];
    expect(card.front).toBeDefined();
    expect(card.back).toBeDefined();
    expect(card.example).toBeDefined();
    expect(card.phonetic).toBeDefined();
  });

  it('practice fillBlanks have required fields', () => {
    const content = c.practice('es');
    expect(content.fillBlanks.length).toBeGreaterThan(0);
    const item = content.fillBlanks[0];
    expect(item.sentence).toBeDefined();
    expect(item.translation).toBeDefined();
    expect(item.answer).toBeDefined();
    expect(item.hint).toBeDefined();
  });
});
