/**
 * Main API handler for URL shortening service
 * 
 * ============================================================
 * Usage (curl examples)
 * ============================================================
 *
 * # 创建短链（自动生成路径）
 * curl -X POST https://your-domain.vercel.app \
 *   -H "Authorization: Bearer <SECRET_KEY>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"url":"https://example.com"}'
 *
 * # 创建短链（指定路径）
 * curl -X POST https://your-domain.vercel.app \
 *   -H "Authorization: Bearer <SECRET_KEY>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"url":"https://example.com","path":"mylink"}'
 *
 * # 创建短链（指定过期时间，单位：分钟）
 * curl -X POST https://your-domain.vercel.app \
 *   -H "Authorization: Bearer <SECRET_KEY>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"url":"https://example.com","path":"mylink","ttl":60}'
 *
 * # 访问短链（重定向）
 * curl -L https://your-domain.vercel.app/mylink
 *
 * # 查询短链对应的目标 URL（需认证）
 * curl https://your-domain.vercel.app/mylink \
 *   -H "Authorization: Bearer <SECRET_KEY>"
 *
 * # 列出所有短链（需认证），返回 JSON 数组
 * curl https://your-domain.vercel.app \
 *   -H "Authorization: Bearer <SECRET_KEY>"
 *
 * # 删除短链
 * curl -X DELETE https://your-domain.vercel.app \
 *   -H "Authorization: Bearer <SECRET_KEY>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"path":"mylink"}'
 *
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
 * Handle POST requests - create shortened URL
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

  const { url: redirectURL, ttl } = body;
  let { path } = body;

  if (!path) {
    path = [...Array(5)].map(i => (~~(Math.random() * 36)).toString(36)).join('');
  }

  if (!redirectURL) {
    return jsonResponse(res, { error: '`url` is required' }, 400);
  }

  // 如果没有 scheme，默认补充 https://
  let finalURL = redirectURL;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(redirectURL)) {
    finalURL = 'https://' + redirectURL;
  }

  try {
    new URL(finalURL);
  } catch (e) {
    if (e instanceof TypeError) {
      return jsonResponse(res, { error: '`url` must be a valid URL' }, 400);
    } else {
      throw e;
    }
  }

  const redis = await getRedisClient();
  const key = LINKS_PREFIX + path;
  
  // Check if path already exists
  const existing = await redis.get(key);
  
  // Set the URL with optional TTL
  let ttlWarning = null;
  let expiresIn = 'never';
  
  if (ttl !== undefined && ttl !== null) {
    let ttlMinutes = parseInt(ttl);
    if (isNaN(ttlMinutes) || ttlMinutes < 1) {
      ttlMinutes = 1;
      ttlWarning = 'invalid ttl, fallback to 1 minute';
    }
    const ttlSeconds = ttlMinutes * 60;
    await redis.setEx(key, ttlSeconds, finalURL);
    expiresIn = `${ttlMinutes} minute(s)`;
  } else {
    await redis.set(key, finalURL);
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const domain = `${protocol}://${host}`;
  
  const result = {
    surl: `${domain}/${path}`,
    path,
    url: finalURL,
    expires_in: expiresIn,
  };
  
  if (existing) result.overwritten = existing;
  if (ttlWarning) result.warning = ttlWarning;
  
  return jsonResponse(res, result, 201);
}

/**
 * Handle DELETE requests - delete shortened URL
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
  return jsonResponse(res, { deleted: path, url: existing }, 200);
}

/**
 * Handle GET requests - list all shortlinks or return 404 if not authenticated
 */
async function handleGET(req, res) {
  const psk = getToken(req);
  if (psk !== process.env.SECRET_KEY) {
    return jsonResponse(res, { error: 'URL not found' }, 404);
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
  
  // Get all URLs
  const links = await Promise.all(
    keys.map(async (key) => {
      const path = key.slice(LINKS_PREFIX.length);
      const url = await redis.get(key);
      return {
        surl: `${domain}/${path}`,
        path,
        url,
      };
    })
  );
  
  return jsonResponse(res, links, 200);
}
