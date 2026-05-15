import { Test } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { LlmService } from './llm.service';
import { StoreModule } from './store/store.module';
import { StoreService } from './store/store.service';
import { ProvidersModule } from './providers/providers.module';
import { ProvidersStore } from './providers/providers.store';

describe('ApiController', () => {
  let c: ApiController;
  let store: StoreService;
  let llm: LlmService;
  let ps: ProvidersStore;

  beforeEach(async () => {
    process.env.DATA_FILE = '/tmp/lingoclaw-test-db.json';
    process.env.PROVIDERS_DB = `/tmp/lingoclaw-test-providers-${Date.now()}.db`;
    const m = await Test.createTestingModule({
      imports: [StoreModule, ProvidersModule],
      controllers: [ApiController],
      providers: [ApiService, LlmService],
    }).compile();
    c = m.get(ApiController);
    store = m.get(StoreService);
    llm = m.get(LlmService);
    ps = m.get(ProvidersStore);
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
    const voiceTalkRole = ps.getRole('voice-talk');
    if (voiceTalkRole) ps.upsertRole({ ...voiceTalkRole, enabled: false });

    const result = await c.voiceTurn(s.id, { transcript: 'bonjour' });
    expect(result.transcript).toBe('bonjour');
    expect(result.assistantMessage.content).toBeDefined();
    expect(typeof result.reply).toBe('string');

    if (voiceTalkRole) ps.upsertRole({ ...voiceTalkRole, enabled: true });
  }, 10000);

  it('voice turn returns config message when both roles disabled', async () => {
    const s = c.createVoiceSession();
    const vtRole = ps.getRole('voice-talk');
    const tcRole = ps.getRole('tutor-chat');
    if (vtRole) ps.upsertRole({ ...vtRole, enabled: false });
    if (tcRole) ps.upsertRole({ ...tcRole, enabled: false });

    const result = await c.voiceTurn(s.id, { transcript: 'test' });
    expect(result.reply).toContain('not configured');

    if (vtRole) ps.upsertRole({ ...vtRole, enabled: true });
    if (tcRole) ps.upsertRole({ ...tcRole, enabled: true });
  }, 10000);

  it('creates realtime bootstrap session for realtime-capable voice model', async () => {
    const vtRole = ps.getRole('voice-talk');
    expect(vtRole).toBeDefined();

    if (vtRole) {
      ps.upsertRole({ ...vtRole, enabled: true, providerId: 'openai-compatible', modelId: 'openai-compatible:gpt-realtime-mini' });
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

  it('realtimeSession throws when model lacks realtime capability', async () => {
    const vtRole = ps.getRole('voice-talk');
    if (vtRole) {
      // Assign a chat-only model to voice-talk
      ps.upsertRole({ ...vtRole, enabled: true, providerId: 'anthropic', modelId: 'anthropic:claude-sonnet-4-5' });
    }

    await expect(c.realtimeSession()).rejects.toThrow(/realtime/i);

    if (vtRole) ps.upsertRole({ ...vtRole });
  });

  it('providers returns seeded providers with models and capabilities', () => {
    const providers = c.listProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
    const first = providers[0];
    expect(first.id).toBeDefined();
    expect(first.compatibilityFamily).toBeDefined();
    expect(Array.isArray(first.models)).toBe(true);
    const model = first.models[0];
    expect(model).toBeDefined();
    expect(model.id).toBeDefined();
    expect(Array.isArray(model.capabilities)).toBe(true);
  });

  it('roles return modelId and denormalized model name', () => {
    const roles = c.listRoles();
    expect(Array.isArray(roles)).toBe(true);
    const tutorChat = roles.find((r: any) => r.id === 'tutor-chat');
    expect(tutorChat).toBeDefined();
    expect(tutorChat!.modelId).toBeDefined();
    expect(tutorChat!.model).toBeTruthy();
  });

  it('addModel adds a model with capabilities to a provider', () => {
    const model = c.addModel('anthropic', { name: 'claude-test-model', capabilities: ['chat'] });
    expect(model.name).toBe('claude-test-model');
    expect(model.capabilities).toContain('chat');
    expect(model.providerId).toBe('anthropic');
  });

  it('deleteModel unassigns affected roles and returns their ids', () => {
    // Add a temp model and assign it to a role
    c.addModel('anthropic', { name: 'tmp-model', capabilities: ['chat'] });
    const roles = ps.getRoles();
    const tcRole = roles.find((r) => r.id === 'tutor-chat');
    if (tcRole) {
      ps.upsertRole({ ...tcRole, providerId: 'anthropic', modelId: 'anthropic:tmp-model' });
    }

    const result = c.deleteModel('anthropic', 'anthropic:tmp-model');
    expect(result.deleted).toBe('anthropic:tmp-model');
    expect(Array.isArray(result.unassignedRoles)).toBe(true);
    expect(result.unassignedRoles).toContain('tutor-chat');

    // Confirm the role no longer has a modelId
    const updatedRole = ps.getRole('tutor-chat');
    expect(updatedRole?.modelId).toBeNull();
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
    const frContent = c.practice('fr');
    expect(frContent.flashcards.length).toBeGreaterThan(0);
    const deContent = c.practice('de');
    expect(deContent.flashcards.length).toBeGreaterThan(0);
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
