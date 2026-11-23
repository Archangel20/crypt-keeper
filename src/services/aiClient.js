// Browser-side AI client. The server route owns provider configuration and
// authentication; the browser sends study notes only.

/**
 * @typedef {Object} AiOptions
 * @property {number} [timeoutMs]
 * @property {typeof fetch} [fetchImpl]
 */

/**
 * Request quiz questions through the server-side quiz route. Resolves with
 * the raw model message text (for parseQuestions).
 * Rejects on network error, non-2xx status, timeout, or an unreadable response.
 * @param {string} notes
 * @param {AiOptions} options
 * @returns {Promise<string>}
 */
export async function requestQuestions(notes, options = {}) {
  const { timeoutMs = 20000, fetchImpl } = options;
  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('fetch is not available');

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response;
    try {
      response = await doFetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
        signal: controller.signal,
      });
    } catch {
      throw new Error(timedOut ? 'AI request timed out' : 'AI request failed');
    }

    if (!response || !response.ok) {
      throw new Error(`AI request failed with status ${response ? response.status : 'unknown'}`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(timedOut ? 'AI request timed out' : 'AI response was not valid JSON');
    }
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : undefined;
    if (typeof content !== 'string') throw new Error('AI response had no message text');
    return content;
  } finally {
    clearTimeout(timer);
  }
}
