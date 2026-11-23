// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  generateQuiz,
  SIMPLE_QUESTIONS_NOTICE,
} from '../../src/logic/generateQuiz.js';
import { generateFallbackQuiz } from '../../src/logic/fallbackGenerator.js';
import { printQuestions, isValidQuiz } from '../../src/logic/quiz.js';

const NOTES = [
  'Mitochondria produce energy for the cell through respiration.',
  'The nucleus stores genetic information inside chromosomes.',
  'Ribosomes assemble proteins using instructions from messenger molecules.',
  'Chloroplasts capture sunlight to perform photosynthesis in plants.',
  'The membrane controls which substances enter or leave the cell.',
  'Lysosomes digest waste material using powerful enzymes inside vesicles.',
].join('\n');

function fallback(notes = NOTES) {
  return generateFallbackQuiz(notes, () => 0.5);
}

const aiQuiz = fallback().questions;

describe('generateQuiz', () => {
  it('uses the fallback when the server quiz route is unavailable', async () => {
    const requestQuestions = vi.fn(async () => {
      throw new Error('provider unavailable');
    });
    const fallbackGenerator = vi.fn(() => fallback());

    const result = await generateQuiz(NOTES, { requestQuestions, fallbackGenerator });

    expect(result).toMatchObject({ ok: true, source: 'Simple questions' });
    expect(result.notice).toBe(SIMPLE_QUESTIONS_NOTICE);
    expect(requestQuestions).toHaveBeenCalledWith(NOTES, expect.objectContaining({
      timeoutMs: 20000,
    }));
  });

  it('returns parsed AI questions with the AI source label', async () => {
    const requestQuestions = vi.fn(async () => printQuestions(aiQuiz));

    const result = await generateQuiz(NOTES, { requestQuestions });

    expect(result).toEqual({ ok: true, questions: aiQuiz, source: 'AI questions' });
    expect(requestQuestions).toHaveBeenCalledWith(NOTES, expect.objectContaining({
      timeoutMs: 20000,
    }));
  });

  it('falls back with a notice when the AI response cannot be parsed', async () => {
    const requestQuestions = vi.fn(async () => 'not JSON');
    const fallbackGenerator = vi.fn(() => fallback());

    const result = await generateQuiz(NOTES, { requestQuestions, fallbackGenerator });

    expect(result).toMatchObject({
      ok: true,
      questions: aiQuiz,
      source: 'Simple questions',
      notice: SIMPLE_QUESTIONS_NOTICE,
    });
    expect(fallbackGenerator).toHaveBeenCalledWith(NOTES, undefined);
  });

  it('falls back with a notice when the AI request fails', async () => {
    const requestQuestions = vi.fn(async () => {
      throw new Error('network failure');
    });
    const fallbackGenerator = vi.fn(() => fallback());

    const result = await generateQuiz(NOTES, { requestQuestions, fallbackGenerator });

    expect(result).toMatchObject({
      ok: true,
      source: 'Simple questions',
      notice: SIMPLE_QUESTIONS_NOTICE,
    });
    expect(isValidQuiz(result.questions)).toBe(true);
  });

  it('returns not-enough-detail without starting a quiz', async () => {
    const fallbackGenerator = vi.fn(() => ({ ok: false, reason: 'not-enough-detail' }));
    const requestQuestions = vi.fn(async () => {
      throw new Error('provider unavailable');
    });

    const result = await generateQuiz('thin notes', { requestQuestions, fallbackGenerator });

    expect(result).toEqual({ ok: false, reason: 'not-enough-detail', notice: SIMPLE_QUESTIONS_NOTICE });
  });

  it('returns a failure when the outer generation guard expires', async () => {
    const requestQuestions = vi.fn(() => new Promise(() => {}));

    const result = await generateQuiz(NOTES, {
      requestQuestions,
      outerTimeoutMs: 5,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'generation-failed',
      message: 'quiz generation failed',
    });
  });
});
