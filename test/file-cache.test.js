import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearFileCache,
  getCacheTtlSeconds,
  getFileCache,
  setFileCache,
} from '../lib/utils/file-cache.js';

class FakeRedis {
  constructor() {
    this.values = new Map();
    this.unlinkShouldFail = false;
  }

  async mGet(keys) {
    return keys.map((key) => this.values.get(key) ?? null);
  }

  multi() {
    const operations = [];
    return {
      setEx: (key, ttl, value) => {
        operations.push({ key, ttl, value });
        return this;
      },
      exec: async () => {
        for (const operation of operations) {
          this.values.set(operation.key, {
            ttl: operation.ttl,
            value: operation.value,
          });
        }
      },
    };
  }

  async unlink(keys) {
    if (this.unlinkShouldFail) {
      throw new Error('unlink failed');
    }
    for (const key of keys) {
      this.values.delete(key);
    }
  }

  async del(keys) {
    for (const key of keys) {
      this.values.delete(key);
    }
  }
}

test('setFileCache writes body and metadata keys with a 1 hour ttl', async () => {
  const redis = new FakeRedis();
  const buffer = Buffer.from('hello file');

  await setFileCache(redis, 'docs/file.bin', {
    buffer,
    contentType: 'application/octet-stream',
    contentLength: buffer.length,
  });

  const bodyEntry = redis.values.get('cache:file:docs/file.bin');
  const metaEntry = redis.values.get('cache:filemeta:docs/file.bin');

  assert.equal(bodyEntry.ttl, getCacheTtlSeconds());
  assert.equal(metaEntry.ttl, getCacheTtlSeconds());
  assert.equal(bodyEntry.value, buffer.toString('base64'));

  const meta = JSON.parse(metaEntry.value);
  assert.equal(meta.contentType, 'application/octet-stream');
  assert.equal(meta.contentLength, buffer.length);
  assert.equal(meta.encoding, 'base64');
  assert.match(meta.checksum, /^[a-f0-9]{40}$/);
});

test('getFileCache restores cached file payload', async () => {
  const redis = new FakeRedis();
  const buffer = Buffer.from('cached body');

  redis.values.set('cache:file:docs/file.bin', {
    ttl: getCacheTtlSeconds(),
    value: buffer.toString('base64'),
  });
  redis.values.set('cache:filemeta:docs/file.bin', {
    ttl: getCacheTtlSeconds(),
    value: JSON.stringify({
      contentType: 'text/plain',
      contentLength: buffer.length,
      encoding: 'base64',
    }),
  });

  const cached = await getFileCache(
    {
      async mGet(keys) {
        return keys.map((key) => redis.values.get(key)?.value ?? null);
      },
    },
    'docs/file.bin',
  );

  assert.deepEqual(cached, {
    buffer,
    contentType: 'text/plain',
    contentLength: buffer.length,
  });
});

test('clearFileCache falls back to DEL when UNLINK fails', async () => {
  const redis = new FakeRedis();
  redis.unlinkShouldFail = true;
  redis.values.set('cache:file:docs/file.bin', { ttl: 3600, value: 'body' });
  redis.values.set('cache:filemeta:docs/file.bin', { ttl: 3600, value: 'meta' });

  await clearFileCache(redis, 'docs/file.bin');

  assert.equal(redis.values.has('cache:file:docs/file.bin'), false);
  assert.equal(redis.values.has('cache:filemeta:docs/file.bin'), false);
});
