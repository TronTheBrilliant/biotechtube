/**
 * Shared DeepSeek API client with retry logic and JSON parsing.
 */

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekOptions {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

export async function callDeepSeek(options: DeepSeekOptions): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const { system, prompt, temperature = 0, maxTokens = 1500, retries = 2 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        if (res.status === 429 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const data = await res.json();
      return data.choices[0]?.message?.content || null;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Parse JSON from a DeepSeek response, handling common quirks.
 */
export function parseDeepSeekJSON<T = unknown>(content: string): T | null {
  try {
    // Strip markdown code fences
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find JSON object or array in the string
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
