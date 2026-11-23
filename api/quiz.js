const REQUEST_TIMEOUT_MS = 20000;

function buildPrompt(notes) {
  return [
    'Create exactly 5 multiple choice questions based on the study notes below.',
    'Each question must have exactly 4 distinct answer options and one correct answer.',
    'Respond with JSON only, no extra text, in this exact format:',
    '{"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0}]}',
    'answerIndex is the 0-based index (0 to 3) of the correct option.',
    '',
    'Study notes:',
    notes,
  ].join('\n');
}

function sendJson(response, status, body) {
  return response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  const notes = request.body && request.body.notes;
  if (typeof notes !== 'string') {
    return sendJson(response, 400, { error: 'Notes are required' });
  }

  const apiKey = typeof process.env.AI_API_KEY === 'string'
    ? process.env.AI_API_KEY.trim()
    : '';
  const apiUrl = typeof process.env.AI_API_URL === 'string'
    ? process.env.AI_API_URL.trim()
    : '';
  const model = typeof process.env.AI_MODEL === 'string'
    ? process.env.AI_MODEL.trim()
    : '';

  if (!apiKey || !apiUrl || !model) {
    return sendJson(response, 503, { error: 'AI provider is unavailable' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let providerResponse;
    try {
      providerResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(notes) }],
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } catch {
      return sendJson(response, 502, { error: 'AI provider request failed' });
    }

    if (!providerResponse.ok) {
      return sendJson(response, 502, { error: 'AI provider request failed' });
    }

    let payload;
    try {
      payload = await providerResponse.json();
    } catch {
      return sendJson(response, 502, { error: 'AI provider returned invalid JSON' });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return sendJson(response, 502, { error: 'AI provider returned an invalid response' });
    }

    return sendJson(response, 200, payload);
  } finally {
    clearTimeout(timer);
  }
}
