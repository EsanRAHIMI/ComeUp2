import { env } from '../config/env.js';

export class AiServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AiServiceError';
  }
}

const AI_REQUEST_TIMEOUT_MS = 120_000;

/** Call the internal AI service with the shared bearer token. */
export async function callAiService<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.AI_SERVICE_URL}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.AI_SERVICE_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiServiceError('AI generation timed out — please try again', 504);
    }
    throw new AiServiceError('AI service unavailable', 502);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let data: { message?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { message?: string };
    } catch {
      throw new AiServiceError('AI service returned an invalid response', 502);
    }
  }
  if (!response.ok) {
    throw new AiServiceError(data.message ?? `AI service failed with ${response.status}`, response.status);
  }
  return data as T;
}
