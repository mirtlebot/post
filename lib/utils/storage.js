/**
 * Helpers for Redis value encoding.
 *
 * Stored format is a JSON string:
 *   {"type":"text","content":"hello","title":"Greeting"}
 */

/** Redis key prefix for every shared link. */
export const LINKS_PREFIX = 'surl:';

/** Preview truncation length in characters. */
export const PREVIEW_LENGTH = 15;

export function buildStoredValue({ type, content, title = '' }) {
  const storedValue = { type, content };
  if (title !== '') {
    storedValue.title = title;
  }
  return JSON.stringify(storedValue);
}

export function parseStoredValue(stored) {
  const parsedValue = JSON.parse(stored);
  return {
    type: typeof parsedValue.type === 'string' ? parsedValue.type : '',
    content: typeof parsedValue.content === 'string' ? parsedValue.content : '',
    title: typeof parsedValue.title === 'string' ? parsedValue.title : '',
  };
}

export function previewContent(type, content) {
  if (type === 'url' || type === 'file') return content;
  return content.length > PREVIEW_LENGTH
    ? content.substring(0, PREVIEW_LENGTH) + '...'
    : content;
}

export function getDomain(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  return `${protocol}://${host}`;
}

export function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
