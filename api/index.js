/**
 * Main API handler for URL shortening service
 * ============================================================
 */

import { getRedisClient } from './redis.js';

const LINKS_PREFIX = 'surl:';

function jsonResponse(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(data) + '\n');
}

function getToken(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'POST':
        return await handlePOST(req, res);
      case 'DELETE':
        return await handleDELETE(req, res);
      case 'GET':
        return await handleGET(req, res);
      default:
        return jsonResponse(res, { error: 'Method not allowed' }, 405);
    }
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse(res, { error: 'Internal server error' }, 500);
  }
}

/**
 * Handle POST requests - create shortened URL or pastebin
 */
async function handlePOST(req, res) {
  if (getToken(req) !== process.env.SECRET_KEY) {
    return jsonResponse(res, { error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await getRequestBody(req);
  } catch {
    return jsonResponse(res, { error: 'Invalid JSON body' }, 400);
  }

  const { url: inputContent, ttl, type: inputType } = body;
  let { path } = body;

  if (!path) {
    path = [...Array(5)].map(i => (~~(Math.random() * 36)).toString(36)).join('');
  }

  if (!inputContent) {
    return jsonResponse(res, { error: '`url` is required' }, 400);
  }

  // Validate explicit type if provided
  if (inputType !== undefined && !['url', 'text', 'html'].includes(inputType)) {
    return jsonResponse(res, { error: '`type` must be one of: url, text, html' }, 400);
  }

  // Check if content is too large
  const maxContentSizeKB = parseInt(process.env.MAX_CONTENT_SIZE_KB, 10) || 500;
  const maxContentSizeBytes = maxContentSizeKB * 1024;
  const contentSize = Buffer.byteLength(inputContent, 'utf8');
  if (contentSize > maxContentSizeBytes) {
    return jsonResponse(res, { error: `Content too large (max ${maxContentSizeKB}KB)` }, 400);
  }

  // Determine content type
  let contentType;
  if (inputType) {
    // Explicit type specified
    contentType = inputType;
  } else {
    // Auto-detect: try to parse as URL
    try {
      new URL(inputContent);
      contentType = 'url';
    } catch (e) {
      contentType = 'text';
    }
  }

  const finalContent = inputContent;

  const redis = await getRedisClient();
  const key = LINKS_PREFIX + path;

  // Store with type prefix: url: / text: / html:
  const storedValue = contentType + ':' + finalContent;
  
  // Check if path already exists
  const existing = await redis.get(key);
  
  // Set the content with optional TTL
  let ttlWarning = null;
  let expiresIn = 'never';
  
  if (ttl !== undefined && ttl !== null) {
    let ttlMinutes = parseInt(ttl);
    if (isNaN(ttlMinutes) || ttlMinutes < 1) {
      ttlMinutes = 1;
      ttlWarning = 'invalid ttl, fallback to 1 minute';
    }
    const ttlSeconds = ttlMinutes * 60;
    await redis.setEx(key, ttlSeconds, storedValue);
    expiresIn = `${ttlMinutes} minute(s)`;
  } else {
    await redis.set(key, storedValue);
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const domain = `${protocol}://${host}`;
  
  const result = {
    surl: `${domain}/${path}`,
    path,
    expires_in: expiresIn,
  };
  
  if (contentType === 'url') {
    result.url = finalContent;
  } else {
    result.text = finalContent.length > 15 ? finalContent.substring(0, 15) + '...' : finalContent;
  }
  
  if (existing) {
    const existingType = existing.startsWith('url:') ? 'url' : existing.startsWith('html:') ? 'html' : 'text';
    const existingContent = existing.substring(existingType.length + 1);
    if (existingType !== 'url') {
      result.overwritten = existingContent.length > 15 ? existingContent.substring(0, 15) + '...' : existingContent;
    } else {
      result.overwritten = existingContent;
    }
  }
  if (ttlWarning) result.warning = ttlWarning;
  
  return jsonResponse(res, result, 201);
}

/**
 * Handle DELETE requests - delete shortened URL or pastebin
 */
async function handleDELETE(req, res) {
  if (getToken(req) !== process.env.SECRET_KEY) {
    return jsonResponse(res, { error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await getRequestBody(req);
  } catch {
    return jsonResponse(res, { error: 'Invalid JSON body' }, 400);
  }

  const { path } = body;
  if (!path) {
    return jsonResponse(res, { error: '`path` is required' }, 400);
  }

  const redis = await getRedisClient();
  const key = LINKS_PREFIX + path;
  
  const existing = await redis.get(key);
  if (!existing) {
    return jsonResponse(res, { error: `path "${path}" not found` }, 404);
  }

  await redis.del(key);
  
  const storedType = existing.startsWith('url:') ? 'url' : existing.startsWith('html:') ? 'html' : 'text';
  const content = existing.substring(storedType.length + 1);
  
  const result = { deleted: path };
  if (storedType === 'url') {
    result.url = content;
  } else {
    result.text = content.length > 15 ? content.substring(0, 15) + '...' : content;
  }
  
  return jsonResponse(res, result, 200);
}

/**
 * Handle GET requests - list all shortlinks if authenticated, 
 * or redirect to path='/' if not authenticated
 */
async function handleGET(req, res) {
  const psk = getToken(req);
  if (psk !== process.env.SECRET_KEY) {
    // Not authenticated, treat as path='/'
    const redis = await getRedisClient();
    const key = LINKS_PREFIX + '/';
    const storedValue = await redis.get(key);
    
    if (!storedValue) {
      return jsonResponse(res, { error: 'URL not found' }, 404);
    }
    
    const isURL = storedValue.startsWith('url:');
    const content = storedValue.substring(isURL ? 4 : 5);
    
    // Not authenticated
    if (isURL) {
      // Redirect to target URL
      res.writeHead(302, { Location: content });
      res.end();
    } else {
      // Display plain text
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(content);
    }
    return;
  }

  const redis = await getRedisClient();
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const domain = `${protocol}://${host}`;
  
  // Scan for all keys with the prefix
  const keys = [];
  let cursor = '0';
  
  do {
    const result = await redis.scan(cursor, {
      MATCH: LINKS_PREFIX + '*',
      COUNT: 100
    });
    cursor = result.cursor;
    keys.push(...result.keys);
  } while (cursor !== '0');
  
  // Get all URLs/texts
  const links = await Promise.all(
    keys.map(async (key) => {
      const path = key.slice(LINKS_PREFIX.length);
      const storedValue = await redis.get(key);
      
      const storedType = storedValue.startsWith('url:') ? 'url' : storedValue.startsWith('html:') ? 'html' : 'text';
      const content = storedValue.substring(storedType.length + 1);
      
      const isExport = req.headers['x-export'] === 'true';
      const displayContent = (storedType !== 'url' && !isExport && content.length > 15)
        ? content.substring(0, 15) + '...'
        : content;

      return {
        surl: `${domain}/${path}`,
        path,
        type: storedType,
        content: displayContent,
      };
    })
  );
  
  return jsonResponse(res, links, 200);
}
