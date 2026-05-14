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
