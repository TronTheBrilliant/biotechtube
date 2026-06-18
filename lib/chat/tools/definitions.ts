import type OpenAI from 'openai'

/**
 * OpenAI-compatible tool definitions exposed to DeepSeek V4.
 *
 * The model receives these on every chat completion call and decides
 * autonomously when to invoke. Keep descriptions specific so the model
 * doesn't fire web_search for questions it can answer from training
 * or attached BiotechTube context (every call costs money).
 */
export const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for recent biotech news, FDA decisions, clinical trial readouts, or any event from after mid-2025 that may not be in your training data or BiotechTube. Use ONLY when the user asks about something time-sensitive that the BiotechTube context does not cover. Each call costs money — do not invoke for general background or questions answerable from training/context.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query, e.g. "Replimune RP1 FDA approval 2026"',
          },
        },
        required: ['query'],
      },
    },
  },
]
