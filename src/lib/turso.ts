import { createClient } from '@libsql/client';

let _client: ReturnType<typeof createClient> | null = null;

export function isTursoConfigured(): boolean {
  return !!process.env.TURSO_DATABASE_URL;
}

function getClient(): ReturnType<typeof createClient> {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not configured');
    _client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN ?? '' });
  }
  return _client;
}

// Lazy proxy — throws at call time (not import time) if TURSO_DATABASE_URL is unset.
// Methods must be bound to the real client so private class fields (#promiseLimitFunction etc)
// remain accessible when called through the proxy.
export const turso: ReturnType<typeof createClient> = new Proxy(
  {} as ReturnType<typeof createClient>,
  {
    get: (_, k: string) => {
      const client = getClient();
      const value = (client as any)[k];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);
