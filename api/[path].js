/**
 * GET /:path
 *
 * 已认证：返回该条目的 JSON 信息（供管理用）
 * 未认证：按类型响应——URL 重定向、HTML 渲染、纯文本输出
 */

import { getRedisClient } from '../lib/redis.js';
import { errorResponse } from '../lib/utils/response.js';
import { LINKS_PREFIX, parseStoredValue } from '../lib/utils/storage.js';
import { respondByType } from '../lib/utils/serve.js';

export default async function handler(req, res) {
  try {
    const path = decodeURIComponent(req.url).slice(1);

    if (!path) return errorResponse(res, { code: 'not_found', message: 'URL not found' }, 404);

    const redis = await getRedisClient();
    const stored = await redis.get(LINKS_PREFIX + path);

    if (!stored) return errorResponse(res, { code: 'not_found', message: 'URL not found' }, 404);

    const { type, content } = parseStoredValue(stored);

    // 统一按公开访问语义处理
    return await respondByType(req, res, { type, content, path, redis });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(res, { code: 'internal', message: 'Internal server error' }, 500);
  }
}
