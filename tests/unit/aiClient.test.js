// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { requestQuestions } from '../../src/services/aiClient.js';

function okResponse(content) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

describe('requestQuestions', () => {
  it('resolves with the raw message text', async () => {
    const fetchImpl = async () => okResponse('{"questions":[]}');
    await expect(requestQuestions('notes', { fetchImpl })).resolves.toBe('{"questions":[]}');
  });

  it('posts notes only to the server quiz route', async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return okResponse('x');
    };
    await requestQuestions('my study notes', { fetchImpl });
    expect(seen.url).toBe('/api/quiz');
    expect(seen.init.method).toBe('POST');
    expect(seen.init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(seen.init.body)).toEqual({ notes: 'my study notes' });
    expect(seen.init.body).not.toContain('apiKey');
    expect(seen.init.body).not.toContain('Authorization');
  });

  it('rejects on non-2xx responses without exposing provider details', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const err = await requestQuestions('n', { fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('503');
  });

  it('rejects on network error', async () => {
    const fetchImpl = async () => {
      throw new TypeError('network down');
    };
    await expect(requestQuestions('n', { fetchImpl })).rejects.toThrow();
  });

  it('rejects when the response has no message text', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) });
    await expect(requestQuestions('n', { fetchImpl })).rejects.toThrow();
  });

  it('rejects on timeout by aborting the request', async () => {
    let aborted = false;
    const fetchImpl = (url, init) =>
      new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('aborted'));
        });
      });
    await expect(
      requestQuestions('n', { fetchImpl, timeoutMs: 20 }),
    ).rejects.toThrow(/timed out/);
    expect(aborted).toBe(true);
  });
});
