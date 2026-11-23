// Quiz generation orchestration. Side effects are injected at the boundary.
import { requestQuestions as defaultRequestQuestions } from '../services/aiClient.js';
import { isValidQuiz, parseQuestions as defaultParseQuestions } from './quiz.js';
import { generateFallbackQuiz as defaultGenerateFallbackQuiz } from './fallbackGenerator.js';

/** @typedef {import('./quiz.js').Question} Question */
/** @typedef {'AI questions'|'Simple questions'} QuizSource */
/**
 * @typedef {{ok:true, questions:Question[], source:QuizSource, notice?:string}} QuizSuccess
 * @typedef {{ok:false, reason:'not-enough-detail', notice?:string}} QuizDetailFailure
 * @typedef {{ok:false, reason:'generation-failed', message:string}} QuizGenerationFailure
 * @typedef {QuizSuccess|QuizDetailFailure|QuizGenerationFailure} GenerateQuizResult
 */

export const OUTER_TIMEOUT_MS = 30000;
export const SIMPLE_QUESTIONS_NOTICE = 'simple questions were used';
export const GENERATION_FAILURE_MESSAGE = 'quiz generation failed';

/**
 * @typedef {Object} GenerateQuizOptions
 * @property {number} [aiTimeoutMs]
 * @property {number} [requestTimeoutMs]
 * @property {number} [outerTimeoutMs]
 * @property {number} [generationTimeoutMs]
 * @property {number} [timeoutMs] Used as a test/configuration override for the outer guard.
 * @property {typeof fetch} [fetchImpl]
 * @property {typeof defaultRequestQuestions} [requestQuestions]
 * @property {typeof defaultRequestQuestions} [requestQuestionsImpl]
 * @property {typeof defaultRequestQuestions} [request]
 * @property {typeof defaultParseQuestions} [parseQuestions]
 * @property {typeof defaultParseQuestions} [parseQuestionsImpl]
 * @property {typeof defaultParseQuestions} [parse]
 * @property {typeof defaultGenerateFallbackQuiz} [generateFallbackQuiz]
 * @property {typeof defaultGenerateFallbackQuiz} [generateFallbackQuizImpl]
 * @property {typeof defaultGenerateFallbackQuiz} [fallbackGenerator]
 * @property {typeof defaultGenerateFallbackQuiz} [fallbackGeneratorImpl]
 * @property {typeof defaultGenerateFallbackQuiz} [fallback]
 * @property {() => number} [rng]
 */

/**
 * Return a failure result without exposing a rejected promise to the screen layer.
 * @returns {QuizGenerationFailure}
 */
function generationFailure() {
  return { ok: false, reason: 'generation-failed', message: GENERATION_FAILURE_MESSAGE };
}

/**
 * Run the fallback and discard anything that is not a complete valid quiz.
 * @param {string} notes
 * @param {GenerateQuizOptions} options
 * @param {boolean} usedAfterAiFailure
 * @returns {GenerateQuizResult}
 */
function useFallback(notes, options, usedAfterAiFailure) {
  const fallback = options.generateFallbackQuiz
    || options.generateFallbackQuizImpl
    || options.fallbackGenerator
    || options.fallbackGeneratorImpl
    || options.fallback
    || defaultGenerateFallbackQuiz;

  try {
    const result = fallback(notes, options.rng);
    if (!result || result.ok !== true) {
      if (result && result.reason === 'not-enough-detail') {
        return usedAfterAiFailure
          ? { ...result, notice: SIMPLE_QUESTIONS_NOTICE }
          : result;
      }
      return generationFailure();
    }
    if (!isValidQuiz(result.questions)) return generationFailure();
    return {
      ok: true,
      questions: result.questions,
      source: 'Simple questions',
      ...(usedAfterAiFailure ? { notice: SIMPLE_QUESTIONS_NOTICE } : {}),
    };
  } catch {
    return generationFailure();
  }
}

/**
 * Generate one complete five-question quiz.
 *
 * Provider configuration and authentication stay behind the server route.
 * Any route failure is converted into the local fallback.
 *
 * @param {string} notes
 * @param {GenerateQuizOptions} [options]
 * @returns {Promise<GenerateQuizResult>}
 */
export async function generateQuiz(notes, options = {}) {
  const run = async () => {
    const request = options.requestQuestions
      || options.requestQuestionsImpl
      || options.request
      || defaultRequestQuestions;
    const parse = options.parseQuestions
      || options.parseQuestionsImpl
      || options.parse
      || defaultParseQuestions;

    try {
      const raw = await request(notes, {
        timeoutMs: options.aiTimeoutMs ?? options.requestTimeoutMs ?? 20000,
        fetchImpl: options.fetchImpl,
      });
      let parsed;
      try {
        parsed = parse(raw);
      } catch {
        parsed = { ok: false };
      }
      if (parsed && parsed.ok === true && isValidQuiz(parsed.questions)) {
        return { ok: true, questions: parsed.questions, source: 'AI questions' };
      }
    } catch {
      // An AI error is intentionally converted to the offline fallback.
    }

    return useFallback(notes, options, true);
  };

  const outerTimeoutMs = options.outerTimeoutMs
    ?? options.generationTimeoutMs
    ?? options.timeoutMs
    ?? OUTER_TIMEOUT_MS;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(generationFailure()), outerTimeoutMs);
  });

  try {
    return await Promise.race([run(), timeout]);
  } catch {
    return generationFailure();
  } finally {
    clearTimeout(timer);
  }
}
