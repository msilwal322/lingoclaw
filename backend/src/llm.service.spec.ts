import { LlmService } from './llm.service';

describe('LlmService', () => {
  let svc: LlmService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    svc = new LlmService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── resolveApiKey ──────────────────────────────────────────────────────────

  describe('resolveApiKey', () => {
    it('returns env var value when env var exists', () => {
      process.env.TEST_LLM_KEY = 'from-env';
      expect(svc.resolveApiKey('TEST_LLM_KEY')).toBe('from-env');
      delete process.env.TEST_LLM_KEY;
    });

    it('returns literal string when no matching env var', () => {
      delete process.env.LITERAL_API_KEY_XYZ;
      expect(svc.resolveApiKey('LITERAL_API_KEY_XYZ')).toBe('LITERAL_API_KEY_XYZ');
    });

    it('returns undefined for undefined apiKeyRef', () => {
      expect(svc.resolveApiKey(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(svc.resolveApiKey('')).toBeUndefined();
    });

    it('returns undefined for "none"', () => {
      expect(svc.resolveApiKey('none')).toBeUndefined();
    });
  });

  // ── Azure GA realtime endpoints ────────────────────────────────────────────

  describe('createRealtimeSession - Azure GA endpoints', () => {
    const azureProvider = {
      id: 'azure-openai',
      baseUrl: 'https://my-resource.services.ai.azure.com',
      apiKeyRef: 'AZURE_KEY',
      apiVersion: '2025-04-01-preview',
    };
    const role = { model: 'gpt-4o-realtime-preview', temperature: 0.5 };

    beforeEach(() => {
      process.env.AZURE_KEY = 'test-azure-key';
    });

    afterEach(() => {
      delete process.env.AZURE_KEY;
    });

    it('posts to GA client_secrets URL (no api-version or deployment query params)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'eph_token_abc', id: 'sess_123' }),
      });

      await svc.createRealtimeSession(azureProvider, role, { instructions: 'test' });

      const calledUrl: string = fetchMock.mock.calls[0][0];
      expect(calledUrl).toBe('https://my-resource.services.ai.azure.com/openai/v1/realtime/client_secrets');
      expect(calledUrl).not.toContain('api-version');
      expect(calledUrl).not.toContain('realtimeapi');
    });

    it('returns GA calls URL with session_id as first query param', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'eph_token_abc', id: 'sess_123' }),
      });

      const result = await svc.createRealtimeSession(azureProvider, role, { instructions: 'test' });

      expect(result.connectUrl).toBe(
        'https://my-resource.services.ai.azure.com/openai/v1/realtime/calls?session_id=sess_123',
      );
      expect(result.connectUrl).not.toContain('realtimewrtc');
      expect(result.connectUrl).not.toContain('api-version');
    });

    it('extracts ephemeral key from top-level data.value (GA response shape)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'eph_ga_token', id: 'sess_456' }),
      });

      const result = await svc.createRealtimeSession(azureProvider, role, { instructions: 'test' });

      expect(result.ephemeralKey).toBe('eph_ga_token');
    });

    it('falls back to client_secret.value for OpenAI response shape', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ client_secret: { value: 'openai_eph_token' }, id: 'sess_789' }),
      });

      const result = await svc.createRealtimeSession(azureProvider, role, { instructions: 'test' });

      expect(result.ephemeralKey).toBe('openai_eph_token');
    });

    it('sends session-wrapped body with type=realtime for Azure GA', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'eph_token', id: 'sess_1' }),
      });

      await svc.createRealtimeSession(azureProvider, role, { instructions: 'test' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.session).toBeDefined();
      expect(body.session.type).toBe('realtime');
      expect(body.session.model).toBe('gpt-4o-realtime-preview');
      expect(body.session_type).toBeUndefined();
    });

    it('sends api-key header not Authorization for Azure', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'eph_token', id: 'sess_1' }),
      });

      await svc.createRealtimeSession(azureProvider, role, { instructions: 'test' });

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['api-key']).toBe('test-azure-key');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('also detects .openai.azure.com hostname as Azure', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'eph_token', id: 'sess_2' }),
      });

      const azureLegacyProvider = { ...azureProvider, baseUrl: 'https://my-res.openai.azure.com' };
      const result = await svc.createRealtimeSession(azureLegacyProvider, role, { instructions: 'test' });

      expect(result.connectUrl).toContain('/openai/v1/realtime/calls');
    });
  });

  // ── URL normalisation ──────────────────────────────────────────────────────

  describe('URL normalisation', () => {
    it('strips trailing slash from baseUrl so no double-slash appears', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      });

      await svc.chat(
        { id: 'openai-compatible', baseUrl: 'https://api.example.com/v1/', apiKeyRef: undefined },
        { model: 'gpt-4', temperature: 0.7 },
        [{ role: 'user', content: 'hi' }],
      );

      const calledUrl: string = fetchMock.mock.calls[0][0];
      expect(calledUrl).toBe('https://api.example.com/v1/chat/completions');
      expect(calledUrl).not.toContain('//chat');
    });
  });

  // ── OpenAI-compatible auth ─────────────────────────────────────────────────

  describe('OpenAI-compatible provider', () => {
    const provider = {
      id: 'openai-compatible',
      baseUrl: 'https://api.example.com/v1',
      apiKeyRef: undefined as string | undefined,
    };
    const role = { model: 'gpt-4', temperature: 0.7 };
    const messages = [{ role: 'user', content: 'hello' }];

    it('sends Authorization header with literal key', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      });

      delete process.env.MYKEY_NOTEXIST;
      await svc.chat(
        { ...provider, apiKeyRef: 'MYKEY_NOTEXIST' },
        role,
        messages,
      );

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer MYKEY_NOTEXIST');
    });

    it('sends Authorization header from env var', async () => {
      process.env.OPENAI_KEY_TEST = 'secret-from-env';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      });

      await svc.chat(
        { ...provider, apiKeyRef: 'OPENAI_KEY_TEST' },
        role,
        messages,
      );

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer secret-from-env');
      delete process.env.OPENAI_KEY_TEST;
    });

    it('omits Authorization header when no key', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      });

      await svc.chat({ ...provider, apiKeyRef: undefined }, role, messages);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  // ── Anthropic auth ─────────────────────────────────────────────────────────

  describe('Anthropic provider', () => {
    const provider = {
      id: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKeyRef: 'ANTHROPIC_API_KEY',
    };
    const role = { model: 'claude-haiku-4-5', temperature: 0.7 };
    const messages = [{ role: 'user', content: 'hello' }];

    it('sends x-api-key header from env var', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'hi' }] }),
      });

      await svc.chat(provider, role, messages);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['x-api-key']).toBe('sk-ant-test');
      expect(headers['Authorization']).toBeUndefined();
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('sends x-api-key header from literal key when env var absent', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'hi' }] }),
      });

      await svc.chat(provider, role, messages);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['x-api-key']).toBe('ANTHROPIC_API_KEY');
    });
  });
});
