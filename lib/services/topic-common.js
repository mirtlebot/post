import {
  LINKS_PREFIX,
  parseStoredValue,
} from '../utils/storage.js';

export const TOPIC_TYPE = 'topic';
export const TOPIC_PLACEHOLDER_MEMBER = '__topic_placeholder__';

export function getTopicItemsKey(topicName) {
  return `topic:${topicName}:items`;
}

function normalizeMultiExecResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((result) => {
    if (Array.isArray(result) && result.length === 2) {
      return result[1];
    }

    return result;
  });
}

async function executeMulti(redis, commands) {
  if (commands.length === 0) {
    return [];
  }

  const multi = redis.multi();
  for (const { method, args } of commands) {
    multi[method](...args);
  }

  return normalizeMultiExecResults(await multi.exec());
}

export async function readStoredValues(redis, keys) {
  if (keys.length === 0) {
    return [];
  }

  return redis.mGet(keys);
}

export async function readTopicEntries(redis, topicNames) {
  return readStoredValues(redis, topicNames.map((topicName) => `${LINKS_PREFIX}${topicName}`));
}

export async function countTopicItemsBatch(redis, topicNames) {
  return executeMulti(
    redis,
    topicNames.map((topicName) => ({
      method: 'zCard',
      args: [getTopicItemsKey(topicName)],
    })),
  );
}

export async function readTtlValues(redis, keys) {
  return executeMulti(
    redis,
    keys.map((key) => ({
      method: 'ttl',
      args: [key],
    })),
  );
}

export async function readStoredTopic(redis, topicName) {
  const storedValue = await redis.get(`${LINKS_PREFIX}${topicName}`);
  return storedValue ? parseStoredValue(storedValue) : null;
}

function capitalizeTopicPath(topicName) {
  if (!topicName) {
    return '';
  }

  return topicName.charAt(0).toUpperCase() + topicName.slice(1);
}

export function resolveTopicDisplayTitle(topicName, storedTopic) {
  if (storedTopic?.type === TOPIC_TYPE && storedTopic.title) {
    return storedTopic.title;
  }

  return capitalizeTopicPath(topicName);
}

export async function getTopicDisplayTitle(redis, topicName) {
  return resolveTopicDisplayTitle(topicName, await readStoredTopic(redis, topicName));
}

export async function ensureTopicItemsKey(redis, topicName) {
  await redis.zAdd(getTopicItemsKey(topicName), {
    score: 0,
    value: TOPIC_PLACEHOLDER_MEMBER,
  });
}

export async function countTopicItems(redis, topicName) {
  const memberCount = await redis.zCard(getTopicItemsKey(topicName));
  return memberCount > 0 ? memberCount - 1 : 0;
}
