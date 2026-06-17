import { env } from '../config/env.js';

export class AiServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AiServiceError';
  }
}

/** Call the internal AI service with the shared bearer token. */
export async function callAiService<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.AI_SERVICE_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiServiceError('AI service unavailable', 502);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new AiServiceError(data.message ?? `AI service failed with ${response.status}`, response.status);
  }
  return data as T;
}
