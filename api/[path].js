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

/**
 * Main handler for path-based requests
 */
export default async function handler(req, res) {
  try {
    const path = req.query.path;
    
    if (!path) {
      return jsonResponse(res, { error: 'URL not found' }, 404);
    }

    const redis = await getRedisClient();
    const key = LINKS_PREFIX + path;
    const redirectURL = await redis.get(key);
    
    if (!redirectURL) {
      return jsonResponse(res, { error: 'URL not found' }, 404);
    }

    // If authenticated, return JSON info instead of redirecting
    const token = getToken(req);
    if (token === process.env.SECRET_KEY) {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers['host'];
      const domain = `${protocol}://${host}`;
      return jsonResponse(res, { 
        surl: `${domain}/${path}`, 
        path, 
        url: redirectURL,
      }, 200);
    }

    // Redirect to target URL
    res.writeHead(302, { Location: redirectURL });
    res.end();
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse(res, { error: 'Internal server error' }, 500);
  }
}
