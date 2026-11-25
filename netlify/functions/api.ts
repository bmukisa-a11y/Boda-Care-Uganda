import serverless from 'serverless-http';
import { createApiApp } from '../../server.ts';

type ServerlessHandler = ReturnType<typeof serverless>;

let cachedHandler: ServerlessHandler | null = null;

function getHandler(): ServerlessHandler {
  if (!cachedHandler) {
    const app = createApiApp({ enableScheduler: false });
    cachedHandler = serverless(app);
  }
  return cachedHandler;
}

function normalizeNetlifyEvent(event: unknown): unknown {
  if (!event || typeof event !== 'object') return event;
  const ev = { ...(event as Record<string, unknown>) };
  const rawUrl = typeof ev.rawUrl === 'string' ? ev.rawUrl : '';
  const currentPath = typeof ev.path === 'string' ? ev.path : '';

  if (
    (!currentPath || currentPath === '/.netlify/functions/api' || currentPath === '/.netlify/functions/api/') &&
    rawUrl
  ) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.pathname.startsWith('/api') || parsed.pathname.startsWith('/.netlify/functions/api')) {
        ev.path = parsed.pathname;
      }
    } catch {
      // ignore malformed rawUrl
    }
  }
  return ev;
}

export const handler = async (event: unknown, context: unknown) => {
  if (context && typeof context === 'object') {
    (context as { callbackWaitsForEmptyEventLoop?: boolean }).callbackWaitsForEmptyEventLoop = false;
  }

  try {
    const activeHandler = getHandler();
    const normalizedEvent = normalizeNetlifyEvent(event);
    const result = await activeHandler(
      normalizedEvent as Parameters<ServerlessHandler>[0],
      context as Parameters<ServerlessHandler>[1]
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Netlify API invocation failed.';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        error: message,
        source: 'netlify-function-api',
      }),
    };
  }
};
